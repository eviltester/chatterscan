<?php
session_start();
set_time_limit(40);
require "config/config.php";
require "includes/chatterscan_funcs.php";
require "includes/TweetRendererClass.php";
require "config/env/".getEnvironmentName()."/oauthconfig.php";
require "includes/debug_functions.php";
require "config/env/".getEnvironmentName()."/debugconfig.php";
require "includes/TweetRepresentationClass.php";
require "includes/filters.php";
require "includes/ShowTweetDeciderClass.php"
?>
<html>
<head>
    <title>Showing Tweets with links | ChatterScan</title>
    <?php
    require "includes/metatags.php";
    $metatags["description"] = "Showing the tweets from your home feed or list that contain links and valuable information only.";
    outputMetaTags();
    ?>

    <?php
    // only bring in analytics if first request when no params in url
    if(count($_GET) == 0){
        require "config/env/" . getEnvironmentName() . "/ga.php";
    }
    ?>




    <script type="text/javascript" src="js/session_url_storage.js"></script>
    <script type="text/javascript" src="js/url_cookie_storage.js"></script>
    <script type="text/javascript" src="js/muted_account_storage.js"></script>
    <script type="text/javascript" src="js/filters.js"></script>
    <script type="text/javascript" src="js/mainview.js"></script>


</head>

<body>
<?php
require "twitteroauth-0.7.4/autoload.php";

use Abraham\TwitterOAuth\TwitterOAuth;


// see https://twitteroauth.com/callback.php


$access_token = $_SESSION['access_token'];

$connection = new TwitterOAuth(CONSUMER_KEY, CONSUMER_SECRET,  $access_token['oauth_token'], $access_token['oauth_token_secret']);

$user=null;

try{
    $user = $connection->get("account/verify_credentials");
}catch(Exception $e){
    retry_based_on_twitter_exception($e);
}



echo "<div class='page-content'>";

echo "<!-- env ".getEnvironmentName()." debug ".is_debug_mode()." -->";

// Print the Page Header
require "includes/header.php";



exit_if_oauth_error($user);

show_logout_link();

echo_twitter_user_details($user);

// add user details to support javascript later
$twitterUserHandle = $user->screen_name;
$twitterUserName = $user->name;
echo <<<USERDETAILSFORJS
    <script>
        const twitterUserName = '${twitterUserName}';
        const twitterUserHandle = '${twitterUserHandle}';
    </script>
USERDETAILSFORJS;


$numberToShow=100;

// $params are sent to twitter
//$params = ["count" => $numberToShow, "exclude_replies" => true, "tweet_mode" => "extended", "include_rts" => false];

$params = ["count" => $numberToShow, "tweet_mode" => "extended"];

debug_var_dump_pre("DEBUG: Params", $params);

$filters->setParamsFromFilters($params);

debug_var_dump_pre("DEBUG: Params AFter Filters", $params);

// extra params are url parameters
$extra_params = [];


$markdownOutput="";
$hiddenmarkdownOutput="";
$hiddenReplyMarkdownOutput="";
$hiddenRetweetMarkdownOutput="";
$hiddenSensitiveMarkdownOutput="";
$hiddenNoLinksMarkdownOutput="";
$hiddenHasLinksMarkdownOutput="";



$pageNamePHP = $_SERVER['PHP_SELF'];
$filters->setNextUrl($pageNamePHP);

$filters->setFiltersFromRequest($params, $extra_params, $user->screen_name);

debug_var_dump_pre("DEBUG: Filters From Request", $filters);


$apiCallConfig = $filters->getApiCallConfigFromFilter();
$api_call = $apiCallConfig->api_call_endpoint;
$showing_list = $apiCallConfig->api_display_name;



debug_var_dump_pre("DEBUG: Twitter API Request", $params);

// https://stackoverflow.com/questions/38717816/twitter-search-api-text-field-value-is-truncated
// tweet_mode extended to get full_text
$statuses=null;
try{
    $statuses = $connection->get($api_call, $params);
}catch(Exception $e){
    retry_based_on_twitter_exception_later($e);
}
//debug_var_dump_pre("DEBUG: TWitter Response", $statuses);

// response format is different for a search - we need to get statuses from the response
if($filters->is_hashtag_search() || $filters->is_search()){
    $statuses = $statuses->statuses;
    // debug_var_dump_pre("DEBUG: TWitter Response", $statuses);
}

$filters->echo_filters_menu($extra_params);


echo "<div id='pluginscontrol'>";
echo "<h2>Plugins</h2><div id='header-plugins-section'></div>";
echo "</div>";

echo "<div class='tweets-section'>";

echo "<div id='next-button-placemarker'></div>";

$editButtonHTML = "";
if($filters->is_search()) {
    $editButtonHTML = " <button onclick='searchForTerm(true,decodeURIComponent(\"".
        $filters->search.
        "\"))'>Edit Search</button>";
}
$displayListTitleHTML = "<h1>".$showing_list."</h1>".
    "<p style='text-align: center;'>".$editButtonHTML."</p>";

echo $displayListTitleHTML;

// https://developer.twitter.com/en/docs/tweets/data-dictionary/overview/tweet-object
$first_id=0;
$max_id=0;
$ignore=false;
$shown_count=0;
$number_processed=0;
$twitter_error=false;

$hidden_retweet_ignore_count=0;
$hidden_possibly_sensitive_count=0;
$hidden_no_links_count=0;
$hidden_has_links_count=0;
$hidden_reply_count=0;
$threaded_tweets_count=0;

// allow seeing hidden tweets
$hidden_retweet_ignore_html="";
$hidden_possibly_sensitive_html="";
$hidden_no_links_html="";
$hidden_has_links_html="";
$hidden_reply_html="";

$threaded_tweets_html="";

if(is_null($statuses)){
    goto endProcessingStatuses;
}

$twitterResponse = new TwitterResponse();
$twitterResponse->fromResponse($statuses);

if($twitterResponse->isError){
    $twitter_error=true;
    echo "<h2>Sorry, Twitter says - ".$twitterResponse->errorMessage." Code: ".$twitterResponse->errorCode."</h2>";
    echo "<p>Home feed is limited to 15 requests in 15 minutes by Twitter - try using a list view instead.</p>";
    // TODO - make a call here to the rate limiting api and describe the limits
    // https://developer.twitter.com/en/docs/developer-utilities/rate-limit-status/api-reference/get-application-rate_limit_status
    debug_var_dump_as_html_comment("Twitter reported an error", $statuses);
    $max_id = $twitterResponse->maxIdOnError;
    goto endProcessingStatuses;
}

$tweetRenderer = new TweetRenderer();
$tweetRenderer->forUserHandle($user->screen_name);
$tweetRenderer->mainPage($pageNamePHP);


// calling this posts because we want to handle multiple types of things
$postsToRender = [];



foreach ($twitterResponse->statuses as $value){

    $debug_info = [];

    debug_var_dump_as_html_comment("Tweet Data that is about to be processed", $value);

    array_merge($debug_info, $value->debug_info);

    $showTweetDecider = new ShowTweetDecider();
    $ignore = $showTweetDecider->decideIfTweetShown($filters, $value);

    array_merge($debug_info, $showTweetDecider->debug_info);


    // decision - show full tweet instead (20190618) but make decision about link if it is in display range
    $display_portion = $value->full_text;


    $tweetRenderer->tweetToRender($value);

    $tweet_link_url = $tweetRenderer->getTweetLinkURL();

    $debug_info["tweet_link_url"] = $tweet_link_url;


    $displayTweetHTML = $tweetRenderer->getTweetAsHTML();


    if($value->tweetIsPossibleThread){
        $threaded_tweets_html = $threaded_tweets_html.$displayTweetHTML;
        $threaded_tweets_count=$threaded_tweets_count+1;
    }

    if($ignore===false) {


        $linkInTweet = "";
        if(it_contains_http_link($display_portion)) {
            $linkInTweet = get_http_link($display_portion);
        }

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

        $hiddenMarkdownLine ="\n* [$display_portion]($tweet_link_url)";
        $hiddenmarkdownOutput = $hiddenmarkdownOutput.$hiddenMarkdownLine;


        /*
         * TRACK THE REASONS FOR NOT SHOWING THE TWEET
         */

        if($showTweetDecider->hidden_reply){
            $hidden_reply_html = $hidden_reply_html.$displayTweetHTML;
            $hiddenReplyMarkdownOutput = $hiddenReplyMarkdownOutput.$hiddenMarkdownLine;
            $hidden_reply_count++;
        }
        if($showTweetDecider->hidden_retweet_ignore){
            $hidden_retweet_ignore_html=$hidden_retweet_ignore_html.$displayTweetHTML;
            $hiddenRetweetMarkdownOutput = $hiddenRetweetMarkdownOutput.$hiddenMarkdownLine;
            $hidden_retweet_ignore_count++;
        }
        if($showTweetDecider->hidden_possibly_sensitive) {
            $hidden_possibly_sensitive_html = $hidden_possibly_sensitive_html.$displayTweetHTML;
            $hiddenSensitiveMarkdownOutput = $hiddenSensitiveMarkdownOutput.$hiddenMarkdownLine;
            $hidden_possibly_sensitive_count++;
        }
        if($showTweetDecider->hidden_no_links) {
            $hidden_no_links_html = $hidden_no_links_html.$displayTweetHTML;
            $hiddenNoLinksMarkdownOutput = $hiddenNoLinksMarkdownOutput.$hiddenMarkdownLine;
            $hidden_no_links_count++;
        }
        if($showTweetDecider->hidden_has_links) {
            $hidden_has_links_html = $hidden_has_links_html.$displayTweetHTML;
            $hiddenHasLinksMarkdownOutput = $hiddenHasLinksMarkdownOutput.$hiddenMarkdownLine;
            $hidden_has_links_count++;
        }


        debug_echo("Ignored Tweet: ".$value->id." ".$tweet_link_url);
        $debug_info["tweet_shown_state"] = "IGNORED - TWEET NOT SHOWN";
    }



    debug_var_dump_pre("Tweet debug info", $debug_info);

    $max_id = $value->id;
    $ignore=false;
    $number_processed++;
}

endProcessingStatuses:

// end tweets section for css styling
echo "</div>";



function outputAsHTMLCommentBlock($aComment){
    echo "\n<!--\n";
    echo $aComment;
    echo "\n-->\n";

}

//outputAsHTMLCommentBlock($markdownOutput);


function buildNextPageButtonHtml($shown_count, $number_processed, $filters, $extra_params, $max_id){
    $buttonHtml = "";
    $buttonHtml = $buttonHtml."<div class='nextpage'>";
    $buttonHtml = $buttonHtml."<p>$shown_count/$number_processed</p>";
    $buttonHtml = $buttonHtml.$filters->buildButtonOrLink_including($extra_params,"from_tweet_id",$max_id, "Next Page");
    $buttonHtml = $buttonHtml."</div>";
    return $buttonHtml;
}


function showNextPageButton($shown_count, $number_processed, $filters, $extra_params, $max_id){
    echo buildNextPageButtonHtml($shown_count, $number_processed, $filters, $extra_params, $max_id);
}

function showHiddenTweetIndexLink(){
    echo "<p class='centertext'><a href='#hiddentweetstitle'>Hidden Tweets Contents</a></p>";
}

showNextPageButton($shown_count, $number_processed, $filters, $extra_params, $max_id);

if (function_exists('getHorizontalAdBlock')) {
    print getHorizontalAdBlock();
}


$hidden_tweets_count = $hidden_reply_count + $hidden_has_links_count + $hidden_possibly_sensitive_count + $hidden_has_links_count + $hidden_retweet_ignore_count + $threaded_tweets_count;

$hidden_tweets_to_show = $hidden_tweets_count>0;

if($hidden_tweets_to_show) {
    echo "<br/><br/><div><p id='hiddentweetstitle'>View Any Available Hidden Tweets</p>";
}



if(strlen($threaded_tweets_html)>0){
    echo "<details><summary>Threaded Tweets ".$threaded_tweets_count."</summary>";
    echo $threaded_tweets_html;
    showHiddenTweetIndexLink();
    showNextPageButton($threaded_tweets_count, $number_processed, $filters, $extra_params, $max_id);
    echo "</details>";
}


if(strlen($hidden_retweet_ignore_html)>0){
    echo "<details><summary>Retweets Tweets ".$hidden_retweet_ignore_count."</summary>";
    echo $hidden_retweet_ignore_html;
    showHiddenTweetIndexLink();
    showNextPageButton($hidden_retweet_ignore_count, $number_processed, $filters, $extra_params, $max_id);
    echo "</details>";
//    outputAsHTMLCommentBlock("Hidden Retweet Tweets");
//    outputAsHTMLCommentBlock($hiddenRetweetMarkdownOutput);
}
if(strlen($hidden_no_links_html)>0) {
    echo "<details><summary>No Link in Tweets ".$hidden_no_links_count."</summary>";
    echo $hidden_no_links_html;
    showHiddenTweetIndexLink();
    showNextPageButton($hidden_no_links_count, $number_processed, $filters, $extra_params, $max_id);
    echo "</details>";
//    outputAsHTMLCommentBlock("Hidden No Link Tweets");
//    outputAsHTMLCommentBlock($hiddenNoLinksMarkdownOutput);
}
if(strlen($hidden_possibly_sensitive_html)>0){
    echo "<details><summary>Possibly Sensitive Tweets ".$hidden_possibly_sensitive_count."</summary>";
    echo $hidden_possibly_sensitive_html;
    showHiddenTweetIndexLink();
    showNextPageButton($hidden_possibly_sensitive_count, $number_processed, $filters, $extra_params, $max_id);
    echo "</details>";
//    outputAsHTMLCommentBlock("Hidden Sensitive Tweets");
//    outputAsHTMLCommentBlock($hiddenSensitiveMarkdownOutput);
}
if(strlen($hidden_has_links_html)>0) {
    echo "<details><summary>Has Link In Tweets ".$hidden_has_links_count."</summary>";
    echo $hidden_has_links_html;
    showHiddenTweetIndexLink();
    showNextPageButton($hidden_has_links_count, $number_processed, $filters, $extra_params, $max_id);
    echo "</details>";
//    outputAsHTMLCommentBlock("Hidden Has Link Tweets");
//    outputAsHTMLCommentBlock($hiddenHasLinksMarkdownOutput);
}
if(strlen($hidden_reply_html)>0){
    echo "<details><summary>Reply Tweets ".$hidden_reply_count."</summary>";
    echo $hidden_reply_html;
    showHiddenTweetIndexLink();
    showNextPageButton($hidden_reply_count, $number_processed, $filters, $extra_params, $max_id);
    echo "</details>";
//
}

if($hidden_tweets_to_show) {
    echo "</div>";
}


//outputAsHTMLCommentBlock("All Hidden Tweets Output As Markdown");
//outputAsHTMLCommentBlock($hiddenmarkdownOutput);

// TODO: distinguish between error object returned as $user and a user
// error:
// stdClass Object ( [errors] => Array ( [0] => stdClass Object ( [message] => Your credentials do not allow access to this resource [code] => 220 ) ) )
// vs
// stdClass Object ( [id] => 59615969 [id_str] => 59615969 [name] => Alan Richardson [screen_name] => eviltester [location] => London, England, UK ...

echo "<div id='footer-plugins-section'></div>";

require "includes/footer.php";

// end page content
echo "</div>";

// TODO: have a localstorage of localmutedaccounts of twitterhandles

?>




</body>
</html>
