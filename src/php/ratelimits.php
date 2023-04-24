<?php
header('Location: favourites.php');
die();
/*

A version of main view that retrieves all the tweets for a filter or a specific number to allow exporting.

*/

session_start();
set_time_limit(40);
//error_reporting(-1);
require "config/config.php";
require "includes/chatterscan_funcs.php";
require "includes/debug_functions.php";
require "config/env/" . getEnvironmentName() . "/debugconfig.php";
require "includes/filters.php";
require_once('includes/twitter-api-wrapper.php');
?>
<html>
<head>
    <title>Showing Twitter Rate Limit State | ChatterScan</title>
    <?php
    require "includes/metatags.php";
    $metatags["description"] = "Showing the twitter rate limit state.";
    outputMetaTags();
    ?>

    <?php
    // only bring in analytics if first request when no params in url
    if (count($_GET) == 0) {
        require "config/env/" . getEnvironmentName() . "/ga.php";
    }
    ?>


    <script type="text/javascript" src="js/filters.js"></script>
    <script type="text/javascript" src="js/adhoc_searches.js"></script>
    <script type="text/javascript" src="js/ratelimit_renderer.js"></script>


</head>

<body>
<?php

$twitterApi = new TwitterApi($_SESSION['access_token']);

try {
    $twitterApi->connect();
} catch (Exception $e) {
    retry_based_on_twitter_exception($e);
}


echo "<div class='page-content'>";

echo "<!-- env " . getEnvironmentName() . " debug " . is_debug_mode() . " -->";

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


$pageNamePHP = $_SERVER['PHP_SELF'];
$filters->setNextUrl($pageNamePHP);

$twitter_params_from_request = [];

$showing_list = "Rate Limits";

$filters->echo_filters_menu($extra_params);


echo "<div class='tweets-section'>";

echo "<p>Rate limits reset every 15 minutes.</p>";
echo "<div id='content-here'></div>";


endProcessingStatuses:

// end tweets section for css styling
echo "</div>";


echo "<div id='footer-plugins-section'></div>";

require "includes/footer.php";

if (function_exists('getHorizontalAdBlock')) {
    print getHorizontalAdBlock();
}
// end page content
echo "</div>";


?>


</body>
</html>
