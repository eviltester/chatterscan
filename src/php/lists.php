<?php
session_start();
require "config/config.php";
require "includes/chatterscan_funcs.php";
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

$showing_list = "Owned Lists";

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

function displayListOfListNames($title, $lists, $showHome=true){

    echo "<h1>$title</h1>";

    echo "<ul>";

    if($showHome){
        echo "<li><a href='mainview.php'>Home Feed</a></li>";
    }

    foreach ($lists as $value){
        $slug = $value->slug;
        $list_id = $value->id;
        $uri = $value->uri;
        echo "<li><a href='mainview.php?list=$slug&list_id=$list_id' target='_blank'>$slug</a>";
        echo " [<a href='https://twitter.com/$uri' target='_blank'>on twitter</a>]</li>";
        //echo "<li>";
        //var_dump($value);
        //echo "</li>";
    }

    echo "</ul>";

}

$username=$user->screen_name;

echo "<p>Lists on Twitter</p>";
echo "<ul>";
echo "<li><a href='https://twitter.com/$username/lists' target='_blank'>Owned Lists On Tiwtter</a></li>";
echo "<li><a href='https://twitter.com/$username/lists/subscriptions' target='_blank'>Subscribed Lists On Tiwtter</a></li>";
echo "<li><a href='https://twitter.com/$username/lists/memberships' target='_blank'>Member Lists On Tiwtter</a></li>";
echo "</ul>";


displayListOfListNames($showing_list, $returnedData->lists, true);
displayListOfListNames("Subscribed Lists", $returnedSubscribedData->lists, false);





require "includes/footer.php";

// end page content
echo "</div>";

?>

</body>
</html>
