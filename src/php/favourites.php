<?php
session_start();
require "config/config.php";
require "includes/chatterscan_funcs.php";
require "includes/debug_functions.php";
require "includes/filters.php";
require "config/env/".getEnvironmentName()."/oauthconfig.php";
require "config/env/".getEnvironmentName()."/debugconfig.php";
?>
<html>
<head>
    <title>Favourite Hashtags and Terms| ChatterScan</title>
    <?php
    require "includes/metatags.php";
    $metatags["description"] = "Show tweets from favourite hashtags and search terms.";
    outputMetaTags();
    ?>
    <?php require "config/env/".getEnvironmentName()."/ga.php";  ?>
    <script src="js/localstorage.js"></script>
    <script src="favourites.js"></script>
    <script type="text/javascript" src="js/adhoc_searches.js"></script>


</head>

<body>
<?php

/*
require "twitteroauth-0.7.4/autoload.php";

use Abraham\TwitterOAuth\TwitterOAuth;

require "config/config.php";
// see https://twitteroauth.com/callback.php


$access_token = $_SESSION['access_token'];

$connection = new TwitterOAuth(CONSUMER_KEY, CONSUMER_SECRET,  $access_token['oauth_token'], $access_token['oauth_token_secret']);

$user = $connection->get("account/verify_credentials");
*/

echo "<div class='page-content'>";

// Print the Page Header
require "includes/header.php";

//exit_if_oauth_error($user);

//show_logout_link();

$user = (object) [
    'name' =>  'twitter_api_blocked',
    'screen_name' => 'twitter_api_blocked',
];

echo_twitter_user_details($user);





echo "<script>var username = '@$user->screen_name';</script>";
// use javascript to show a list of hashtags


function startsWith ($string, $startString)
{
    $len = strlen($startString);
    return (substr($string, 0, $len) === $startString);
}



try{


    $api_call = "saved_searches/list";
    $params = [];
    $returnedSavedSearchesData = []; //$connection->get($api_call, $params);

    $urlHandler = new CurrentURLParams;
    $urlParams = $urlHandler->getParams();

    if($urlParams==null || strlen($urlParams)==0){
        $urlParams = "?";
    }

    debug_var_dump_pre("Twitter Saved Searches", $returnedSavedSearchesData);



?>

    <p><strong>Twitter API pricing changes mean that access to the Twitter API is no longer free.
        As a result we can no longer provide full functionality for chatterscan to read twitter feeds.
        However, the storing of 'favourite searches' to use across multiple sites still works.
        Save search terms are only stored in local storage, and are not pulled from Twitter.
        </strong>
    </p>

<?php
    echo "<h2>Twitter Saved Searches</h2>";
    echo "<p><a href='https://help.twitter.com/en/using-twitter/saving-searches' target='_blank'>twitter help</a></p>";

    $namedSearch = array();
    $originalNamedSearch = array();

    foreach ($returnedSavedSearchesData as $twitterSavedSearch) {

        $encodedTerm = urlencode($twitterSavedSearch->query);
        $visibleTerm = strtolower($twitterSavedSearch->name);
        $originalNamedSearch[$visibleTerm]=$twitterSavedSearch->name;
        $namedSearch[$visibleTerm] = $encodedTerm;
    }

    ksort($namedSearch);

    $jsonSavedSearches = array();

    $jsonSavedSearchesData = array();
    foreach ($namedSearch as $key => $value) {
        $jsonDataToAdd = array();
        $jsonDataToAdd = array("encodedTerm"=>$value, "visibleTerm"=>$key, "namedSearch" => $originalNamedSearch[$key], "urlParams"=>$urlParams);
        $jsonSavedSearchesData[] = $jsonDataToAdd;
    }

    $jsonSavedSearches["twitter"] = $jsonSavedSearchesData;


    echo "<script>const searchData = ".json_encode($jsonSavedSearches).";</script>";
    echo "<div id='favouritesGUI'></div>";


}catch(Exception $e){
    echo "<!-- ".$e." -->";
}

?>

<!--
<p>NOTE: you can pass in a list of adhoc terms as URL param (url encoded and comma separated): ?terms=first%20term,anotherterm</p>
-->

<hr/>

<p>Favourites are stored locally in your browser local storage. If you use a different browser to access ChatterScan then you will not see your favourites listed here and will have to recreate them.</p>


<h2>Local Favourite Searches</h2>

<p><button onclick="addSearchTerm()">Add Search Term</button></p>

<div>
    <ul id="searchtermslist">

    </ul>
</div>




<?php


require "includes/footer.php";

// end page content
echo "</div>";

?>

</body>
</html>
