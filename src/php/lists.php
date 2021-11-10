<?php
session_start();
require "config/config.php";
require "includes/chatterscan_funcs.php";
require "includes/filters.php";
require "config/env/".getEnvironmentName()."/oauthconfig.php";
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

require "config/config.php";
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


$numberToShow=300;

$params = ["count" => $numberToShow];

$extra_params = [];

$api_call = "lists/ownerships";

if (isset($_REQUEST['number-of-lists'])){
    $number_of_lists_to_get= $_REQUEST['number-of-lists'];
    $params["count"] = $number_of_lists_to_get;
    echo '<p>Get this many '.$number_of_lists_to_get.'</p>';
}

// https://developer.twitter.com/en/docs/accounts-and-users/create-manage-lists/api-reference/get-lists-ownerships

$returnedData = $connection->get($api_call, $params);

$api_call = "lists/subscriptions";
$returnedSubscribedData = $connection->get($api_call, $params);


//print_r($statuses);

// TODO: show description, number of people in list, number of subscribers, private/public status of list
function displayListOfListNames($title, $lists){

    echo "<h1>$title</h1>";

    echo "<div class='twitter-list-blocks'>";

    $urlHandler = new CurrentURLParams;
    $urlParams = $urlHandler->getParams();

    if(strcmp(substr($urlParams, 0,1),"?")!=0){
        $urlParams = "?".$urlParams;
    }

    //ksort($namedSearch);
    $namedLists = array();

    foreach ($lists as $value){
        $slug = $value->slug;
        $name = $value->name;
        $list_id = $value->id;
        $uri = $value->uri;

        $namedLists[$name] = array("slug"=>$slug, "name"=>$name, "listid" => $list_id, "uri"=>$uri);
    }

    ksort($namedLists);

    foreach ($namedLists as $value){

        $slug = $value["slug"];
        $name = $value["name"];
        $list_id = $value["listid"];
        $uri = $value["uri"];

        $listBlock = <<<EOLB
<div class='twitter-list-block'>
    <div class='twitter-list-header'>
        <a href='mainview.php${urlParams}&list=${slug}&list_id=${list_id}' target='_blank'>
            <button class="pure-button">${name}</button>
        </a>
    </div>
    <div class='twitter-list-description'>
        [<a href='https://twitter.com${uri}' target='_blank'>on twitter</a>]
    </div>
</div>
EOLB;
        echo $listBlock;
    }

    echo "</div>";

}

$username=$user->screen_name;

$twitterListLinks = <<<EOTLL
<div class='lists-on-twitter'>
<a href='https://twitter.com/${username}/lists' target='_blank'>
<button class="pure-button">Manage Your Lists On Twitter</button></a>
<!--<a href='https://twitter.com/${username}/lists/subscriptions' target='_blank'>Subscribed Lists On Twitter</a>-->
<a href='https://twitter.com/${username}/lists/memberships' target='_blank'><button class="pure-button">See Twitter Lists You're On</button></a>
</div>
EOTLL;

echo $twitterListLinks;

displayListOfListNames("Your Lists", $returnedData->lists, true);
displayListOfListNames("Subscribed Lists", $returnedSubscribedData->lists, false);





require "includes/footer.php";

// end page content
echo "</div>";

?>

</body>
</html>
