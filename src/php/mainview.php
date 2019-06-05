<?php
session_start();
require "config/config.php";
require "includes/chatterscan_funcs.php";
require "config/env/".getEnvironmentName()."/oauthconfig.php";
require "includes/debug_functions.php";
require "config/env/".getEnvironmentName()."/debugconfig.php";
?>
<html>
<head>
    <title>Showing Tweets with links | ChatterScan</title>
    <?php
    require "includes/metatags.php";
    $metatags["description"] = "Showing the tweets from your home feed or list that contain links and valuable information only.";
    outputMetaTags();
    ?>
    <?php require "config/env/".getEnvironmentName()."/ga.php";  ?>
</head>

<body>
<?php
require "twitteroauth-0.7.4/autoload.php";

use Abraham\TwitterOAuth\TwitterOAuth;


// see https://twitteroauth.com/callback.php


$access_token = $_SESSION['access_token'];

$connection = new TwitterOAuth(CONSUMER_KEY, CONSUMER_SECRET,  $access_token['oauth_token'], $access_token['oauth_token_secret']);

$user = $connection->get("account/verify_credentials");


echo "<div class='page-content'>";

// Print the Page Header
require "includes/header.php";



exit_if_oauth_error($user);

show_logout_link();

echo_twitter_user_details($user);


$numberToShow=100;

$params = ["count" => $numberToShow, "exclude_replies" => true, "tweet_mode" => "extended", "include_rts" => false];

$extra_params = [];

$api_call = "statuses/home_timeline";

$showing_list = "Showing Home Feed";


$markdownOutput="";

require "includes/filters.php";

$filters->setFiltersFromRequest($params, $extra_params, $user->screen_name);

debug_var_dump_pre("DEBUG: Filters From Request", $filters);


if($filters->is_using_list()){
    $api_call = "lists/statuses";
    $showing_list = "Showing List - $filters->list";
}


if($filters->is_hashtag_search()){
    $api_call = "search/tweets";
    $displayHashTag = str_replace("%23", "#", $filters->hashtag);
    $showing_list = "Showing HashTag - $displayHashTag";
}

if($filters->is_search()){
    $api_call = "search/tweets";
    $displaySearchTerm = $filters->search;
    $showing_list = "Showing Search Term - $displaySearchTerm";
}


debug_var_dump_pre("DEBUG: Twitter API Request", $params);

// https://stackoverflow.com/questions/38717816/twitter-search-api-text-field-value-is-truncated
// tweet_mode extended to get full_text
$statuses = $connection->get($api_call, $params);
//debug_var_dump_pre("DEBUG: TWitter Response", $statuses);

// response format is different for a search - we need to get statuses from the response
if($filters->is_hashtag_search() || $filters->is_search()){
        $statuses = $statuses->statuses;
       // debug_var_dump_pre("DEBUG: TWitter Response", $statuses);
}

$filters->echo_filters_menu($extra_params);

echo "<div class='tweets-section'>";
echo "<h1>$showing_list</h1>";

// https://developer.twitter.com/en/docs/tweets/data-dictionary/overview/tweet-object
$first_id=0;
$max_id=0;
$ignore=false;
$shown_count=0;
$number_processed=0;
$twitter_error=false;

// allow seeing hidden tweets
$hidden_retweet_ignore_html="";
$hidden_possibly_sensitive_html="";
$hidden_no_links_html="";
$hidden_has_links_html="";

if(is_null($statuses)){
    goto endProcessingStatuses;
}
foreach ($statuses as $value){

    $debug_info = [];

    debug_var_dump_as_html_comment("Tweet Data that is about to be processed", $value);

    if (is_array($value) && isset($value[0]->message)) {
        $twitter_error=true;
        echo "<h2>Sorry, Twitter says - ".$value[0]->message." Code: ".$value[0]->code."</h2>";
        echo "<p>Home feed is limited to 15 requests in 15 minutes by Twitter - try using a list view instead.";
        // TODO - make a call here to the rate limiting api and describe the limits
        // https://developer.twitter.com/en/docs/developer-utilities/rate-limit-status/api-reference/get-application-rate_limit_status
        debug_var_dump_as_html_comment("Twitter reported an error", $statuses);
    }



    $hidden_retweet_ignore=false;
    $hidden_possibly_sensitive=false;
    $hidden_no_links=false;
    $hidden_has_links=false;

    if($filters->only_include_retweets){
        // if it is a retweet then ignore
        if(!$value->is_quote_status){
            $ignore=true;
            $debug_info["only_include_retweets"] = "Ignored because we only want retweets but is_quote_status was false";
            $hidden_retweet_ignore=true;
        }else{
            $debug_info["only_include_retweets"] = "is_quote_status was true, so this was included";
        }
    }

    if($filters->ignore_retweets){
        // if it is a retweet then ignore
        if($value->is_quote_status){
            $ignore=true;
            $debug_info["ignore_retweets"] = "Ignored because is_quote_status reported tweet as a quote";
            $hidden_retweet_ignore=true;
        }else{
            $debug_info["ignore_retweets"] = "Included because is_quote_status reported tweet as not being a quote";
        }
    }

    // if it is possibly sensitive then ignore
    // supposed to only be set if tweet has a link - but that isn't true
    if(isset($value->possibly_sensitive)){
        if($value->possibly_sensitive) {
           $ignore = true;
            $debug_info["possibly_sensitive"] = "Ignored because Marked as possibly_sensitive";
            $hidden_possibly_sensitive=true;
        }else{
            $debug_info["possibly_sensitive"] = "Included because not Marked as possibly_sensitive";
        }
    }

    // need to get the display portion of the tweet
    $display_portion = substr($value->full_text, $value->display_text_range[0],$value->display_text_range[1]);
    $debug_info["display_portion"] = $display_portion;
    $debug_info["full_tweet"] = $value->full_text;
    $debug_info["display range"] = "from ".$value->display_text_range[0]." to ".$value->display_text_range[1];

    // if it does not include http
    if (!it_contains_http_link($display_portion)) {
        $debug_info["included http?"] = "It did not include http";
        if(!$filters->include_without_links) {
            $ignore = true;
            $debug_info["include_without_links"] = "IGNORED we are set to not include_without_links";
            $hidden_no_links=true;
        }else{
            $debug_info["include_without_links"] = "SHown we are set to include_without_links";
        }
    }else{
        // it does include links
        $debug_info["included http?"] = "It did include an http";
        if(!$filters->include_links){
            $ignore=true;
            $debug_info["include_links"] = "IGNORE: EXCLUDE LINKS !include_links";
            $hidden_has_links=true;
        }else{
            $debug_info["include_links"] = "SHOWN: allowed to include_links";
        }
    }

    if($twitter_error===false){

        $screenName = $value->user->screen_name;
        $tweetUserDisplayName = $value->user->name;
        $profile_image = $value->user->profile_image_url;

        $profile_name_link_html_start = "<a href='https://twitter.com/$screenName' target='_blank'>";

        $profile_image_https = str_replace("http://", "https://", $profile_image);
        // added width on 20180105 because some people have large images (do not know how, but they do)
        $profile_image_html = "$profile_name_link_html_start <img src='$profile_image_https' width='48px'/></a>";
        $profile_name_link_html = "$profile_name_link_html_start $screenName</a> $tweetUserDisplayName";
        $tweet_link_url = "https://twitter.com/$screenName/status/".$value->id;

        $debug_info["tweet_link_url"] = $tweet_link_url;

        // $hidden_retweet_ignore=false;
        // $hidden_possibly_sensitive
        // $hidden_no_links=false;
        // $hidden_has_links=false;

        $displayTweetHTML = "";
        //echo "<!--".$value->id."-->";
        $displayTweetHTML = $displayTweetHTML."<div class='atweet'>";
        $displayTweetHTML = $displayTweetHTML."<p><strong>$profile_name_link_html</strong></p>";
        $displayTweetHTML = $displayTweetHTML."<h2 class='tweet-text'>$profile_image_html &nbsp; $display_portion</h2>";
        $displayTweetHTML = $displayTweetHTML.'<ul>';
        $displayTweetHTML = $displayTweetHTML."<h3><a href='$tweet_link_url' target='_blank'>view tweet</a></h3>";
        $displayTweetHTML = $displayTweetHTML."<li>$value->created_at</li>";
        $displayTweetHTML = $displayTweetHTML.'</ul>';
        $displayTweetHTML = $displayTweetHTML.'<hr/>';
        $displayTweetHTML = $displayTweetHTML."</div>";

       if($ignore===false) {


           $linkInTweet = get_http_link($display_portion);

           if(strlen(trim($linkInTweet))>0)
           {
               $htmlLinkInTweet = "<a href='$linkInTweet' target='_blank'>$linkInTweet</a>";
               $markdownOutput = $markdownOutput."\n* [$display_portion]($linkInTweet) [-]($tweet_link_url)";
               $displayTweetHTML = str_replace($linkInTweet,$htmlLinkInTweet,$displayTweetHTML);
           }

            echo $displayTweetHTML;
            $shown_count++;

           $debug_info["tweet_shown_state"] = "VIABLE - TWEET WAS SHOWN";




        }else{

           // $hidden_retweet_ignore=false;
           // $hidden_possibly_sensitive
           // $hidden_no_links=false;
           // $hidden_has_links=false;
           if($hidden_retweet_ignore){
                $hidden_retweet_ignore_html=$hidden_retweet_ignore_html.$displayTweetHTML;
           }
           if($hidden_possibly_sensitive) {
               $hidden_possibly_sensitive_html = $hidden_possibly_sensitive_html.$displayTweetHTML;
           }
           if($hidden_no_links) {
               $hidden_no_links_html = $hidden_no_links_html.$displayTweetHTML;
           }
           if($hidden_has_links) {
               $hidden_has_links_html = $hidden_has_links_html.$displayTweetHTML;
           }


           debug_echo("Ignored Tweet: ".$value->id." ".$tweet_link_url);
           $debug_info["tweet_shown_state"] = "IGNORED - TWEET NOT SHOWN";
       }

        debug_var_dump_as_html_comment("Tweet debug info", $debug_info);
    }

    $max_id = $value->id;
    $ignore=false;
    $number_processed++;
}

endProcessingStatuses:

// end tweets section for css styling
echo "</div>";

echo "\n<!--\n";
echo $markdownOutput;
echo "\n-->\n";

echo "<div class='nextpage'>";
echo "<p>$shown_count/$number_processed</p>";
$filters->showButtonOrLink_including($extra_params,"from_tweet_id",$max_id, "Next Page");
echo "</div>";



echo "<br/><br/><details><summary>View Any Available Hidden Tweets</summary>";
    if(strlen($hidden_retweet_ignore_html)>0){
        echo "<details><summary>Retweets Tweets</summary>";
        echo $hidden_retweet_ignore_html;
        echo "</details>";
    }
    if(strlen($hidden_no_links_html)>0) {
        echo "<details><summary>No Link in Tweets</summary>";
        echo $hidden_no_links_html;
        echo "</details>";
    }
    if(strlen($hidden_possibly_sensitive_html)>0){
        echo "<details><summary>Possibly Sensitive Tweets</summary>";
        echo $hidden_possibly_sensitive_html;
        echo "</details>";
    }
    if(strlen($hidden_has_links_html)>0) {
        echo "<details><summary>Has Link In Tweets</summary>";
        echo $hidden_has_links_html;
        echo "</details>";
    }
echo "</details>";

// TODO: distinguish between error object returned as $user and a user
// error:
// stdClass Object ( [errors] => Array ( [0] => stdClass Object ( [message] => Your credentials do not allow access to this resource [code] => 220 ) ) )
// vs
// stdClass Object ( [id] => 59615969 [id_str] => 59615969 [name] => Alan Richardson [screen_name] => eviltester [location] => London, England, UK ...

require "includes/footer.php";

// end page content
echo "</div>";

?>
</body>
</html>
