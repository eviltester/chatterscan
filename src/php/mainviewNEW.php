<?php
session_start();
set_time_limit(40);
//error_reporting(-1);
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
    <script type="text/javascript" src="js/tweetRenderer.js"></script>
    <script type="text/javascript" src="js/adhoc_searches.js"></script>


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
echo "<div id='show-tweets-start-here'></div>";


$displayListTitleHTML = "<h1>".$showing_list."</h1>";

echo $displayListTitleHTML;

if($filters->is_search()) {
    echo "<div class='edit-search-term'></div>";
}

// https://developer.twitter.com/en/docs/tweets/data-dictionary/overview/tweet-object
$first_id=0;
$max_id=0;
$ignore=false;
$shown_count=0;
$number_processed=0;
$twitter_error=false;

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


foreach ($twitterResponse->statuses as $value){

    $debug_info = [];

    debug_var_dump_as_html_comment("Tweet Data that is about to be processed", $value);

    array_merge($debug_info, $value->debug_info);

    $showTweetDecider = new ShowTweetDecider();
    $ignore = $showTweetDecider->decideIfTweetShown($filters, $value);
    $value->setRenderDecision($showTweetDecider);

    array_merge($debug_info, $showTweetDecider->debug_info);


    $max_id = $value->id;
    $ignore=false;
    $number_processed++;
}

endProcessingStatuses:

// end tweets section for css styling
echo "</div>";

$jsonOutputForTesting = json_encode($twitterResponse->statuses, JSON_INVALID_UTF8_IGNORE | JSON_PRETTY_PRINT);


// output the above as a JavaScript variable
// process the variable to output HTML with JavaScript -see code in TweetRendererClass.php convert this to js/tweetRenderer.js
// showVisibleTweets(containerDiv, listOfTweets)

// <pre>${jsonOutputForTesting};</pre>
echo <<<JSONOUTPUT

<div class='hidden-tweets-section'>
</div>

<script>

const allTweetData = ${jsonOutputForTesting};

window.addEventListener('load', (event) => {    
    addEditSearchTermButton();
    renderCollectionOfTweetsInDOM(allTweetData);
});

</script>

JSONOUTPUT;


function buildNextPageButtonHtml($shown_count, $number_processed, $filters, $extra_params, $max_id){
    $buttonHtml = "";
    $buttonHtml = $buttonHtml."<div class='nextpage'>";
    $buttonHtml = $buttonHtml."<p><span class='shown-count'>$shown_count</span>/$number_processed</p>";
    $buttonHtml = $buttonHtml.$filters->buildButtonOrLink_including($extra_params,"from_tweet_id",$max_id, "Next Page");
    $buttonHtml = $buttonHtml."</div>";
    return $buttonHtml;
}


function showNextPageButton($shown_count, $number_processed, $filters, $extra_params, $max_id){
    echo buildNextPageButtonHtml($shown_count, $number_processed, $filters, $extra_params, $max_id);
}

showNextPageButton($shown_count, $number_processed, $filters, $extra_params, $max_id);

if (function_exists('getHorizontalAdBlock')) {
    print getHorizontalAdBlock();
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
