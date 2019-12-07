<?php
session_start();
// TODO: trim includes to bare minimum
require "config/config.php";
require "includes/chatterscan_funcs.php";
require "includes/TweetRendererClass.php";
require "config/env/".getEnvironmentName()."/oauthconfig.php";
require "includes/debug_functions.php";
require "config/env/".getEnvironmentName()."/debugconfig.php";
require "includes/TweetRepresentationClass.php";
?>
<?php
require "twitteroauth-0.7.4/autoload.php";

use Abraham\TwitterOAuth\TwitterOAuth;


// see https://twitteroauth.com/callback.php


$access_token = $_SESSION['access_token'];

$connection = new TwitterOAuth(CONSUMER_KEY, CONSUMER_SECRET,  $access_token['oauth_token'], $access_token['oauth_token_secret']);

$user = $connection->get("account/verify_credentials");

// todo convert this into a JSON or error response
exit_if_oauth_error($user);

$callis="";

if (isset($_REQUEST['apicall'])){
    $callis = $_REQUEST['apicall'];
}


switch ($callis) {
    case "":
        http_response_code(404);
        break;
    case "mutedids":
        // https://developer.twitter.com/en/docs/accounts-and-users/mute-block-report-users/api-reference/get-mutes-users-ids
        $response = $connection->get("mutes/users/ids");
        //$response = $connection->get("statuses/home_timeline");
        $jsonResponse = new StdClass();
        $jsonResponse->ids = $response->ids;
        echo json_encode($jsonResponse);
        //todo handle pages and cursors if too many
        break;
}


// todo: route to different calls for different params
//$statuses = $connection->get($api_call, $params);

?>