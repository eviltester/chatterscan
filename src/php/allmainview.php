<?php
header('Location: favourites.php');
/*

A version of main view that retrieves all the tweets for a filter or a specific number to allow exporting.

*/

//TODO: when this works for pushing the display decision into JS rename mainview_allmaintemp.js back to mainview

// TODO: GUI should have options for 'how much to get'
// e.g. stop when found id, until last date to process, get 100 items, get all

// TODO: download button to download json file

session_start();
set_time_limit(40);
//error_reporting(-1);
require "config/config.php";
require "includes/chatterscan_funcs.php";
require "includes/debug_functions.php";
require "config/env/".getEnvironmentName()."/debugconfig.php";
require "includes/TweetRepresentationClass.php";
require "includes/filters.php";
require "includes/ShowTweetDeciderClass.php";
require_once('includes/twitter-api-wrapper.php');
?>
<html>
<head>
    <title>Showing Tweets For Extract | ChatterScan</title>
    <?php
    require "includes/metatags.php";
    $metatags["description"] = "Showing the tweets from your home feed or list for exporting.";
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
    <script type="text/javascript" src="js/mainview_allmaintemp.js"></script>
    <script type="text/javascript" src="js/libs/wordcloud2.js"></script>
    <script type="text/javascript" src="js/tweet_renderer.js"></script>
    <script type="text/javascript" src="js/adhoc_searches.js"></script>
    <script type="text/javascript" src="js/session_hashtag_storage.js"></script>
    <script type="text/javascript" src="js/tweet_decider.js"></script>


</head>

<body>
<?php

$twitterApi = new TwitterApi($_SESSION['access_token']);

try{
    $twitterApi->connect();
}catch(Exception $e){
    retry_based_on_twitter_exception($e);
}



echo "<div class='page-content'>";

echo "<!-- env ".getEnvironmentName()." debug ".is_debug_mode()." -->";

// Print the Page Header
require "includes/header.php";



exit_if_oauth_error($twitterApi->getUser());

show_logout_link();

echo_twitter_user_details($twitterApi->getUser());

// add user details to support javascript later
$twitterUserHandle = $twitterApi->getUser()->screen_name;
$twitterUserName = $twitterApi->getUser()->name;
echo <<<USERDETAILSFORJS
    <script>
        const twitterUserName = '${twitterUserName}';
        const twitterUserHandle = '${twitterUserHandle}';
    </script>
USERDETAILSFORJS;

$twitterApi->setParamsFromFilters($filters);

debug_var_dump_pre("DEBUG: Params AFter Filters", $twitterApi->twitter_params);

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

$twitter_params_from_request = [];

$showing_list = "Twitter Data Extractor";

$filters->echo_filters_menu($extra_params);


echo "<div id='pluginscontrol'>";
echo "<h2>Plugins</h2><div id='header-plugins-section'></div>";
echo "</div>";

echo "<div class='tweets-section'>";

echo "<div id='next-button-placemarker'></div>";

$displayListTitleHTML = "<h1>".$showing_list."</h1>";

echo $displayListTitleHTML;

if($filters->is_search()) {
    echo "<div class='edit-search-term'></div>";
}

echo "<div id='show-tweets-start-here'></div>";



endProcessingStatuses:

// end tweets section for css styling
echo "</div>";

echo <<<JSONOUTPUT

<div class='hidden-tweets-section'>
</div>

JSONOUTPUT;


echo "<div id='footer-plugins-section'></div>";

require "includes/footer.php";

if (function_exists('getHorizontalAdBlock')) {
    print getHorizontalAdBlock();
}
// end page content
echo "</div>";

// TODO: have a localstorage of localmutedaccounts of twitterhandles

?>


</body>
</html>
