<?php
session_start();
// TODO: trim includes to bare minimum
require "config/config.php";
require "includes/chatterscan_funcs.php"; // this is only used for the get environment name so split that out
require "config/env/".getEnvironmentName()."/oauthconfig.php";
require_once('includes/twitter-api-wrapper.php');
?>
<?php


$twitterApi=null;

try {
    $twitterApi = new TwitterApi($_SESSION['access_token']);
    $twitterApi->connect();
}catch(Exception $e){
    http_response_code(502);
    echo(json_encode(array("content"=>"", "error"=>$e->getMessage())));
    exit();
}

function exit_if_errors($returned_data){
    // if the twitter provided an error then print it out and return in json
    if(isset($returned_data->errors)){
        http_response_code(401);
        echo(json_encode(array("content"=>"", "error"=>$returned_data->errors[0]->message)));
        exit();
    }
}

exit_if_errors($twitterApi->getUser());

$callis="";
if (isset($_REQUEST['apicall'])){
    $callis = $_REQUEST['apicall'];
}


function getParamsFromRequest(&$params,$screen_name){

    if (isset($_REQUEST['from_tweet_id'])){
        $from_tweet_id= htmlspecialchars($_REQUEST['from_tweet_id']);
        if(!(""===$from_tweet_id)){
            $params["max_id"] = $from_tweet_id;
        }
    }

    if (isset($_REQUEST['ignore_replies'])){
        $exclude_replies= getBooleanValueFromParam("ignore_replies");
        $params["exclude_replies"] = $exclude_replies;
    }

    if (isset($_REQUEST['include_retweets'])){
        $include_retweets= getBooleanValueFromParam('include_retweets');
        $params["include_rts"] = $include_retweets;
    }


    if (isset($_REQUEST['list'])) {
        $list = htmlspecialchars($_REQUEST['list']);
        if (isset($_REQUEST['list_id'])) {
            $list_id = htmlspecialchars($_REQUEST['list_id']);
        }
        $params["slug"] = $list;
        $params["list_id"] = $list_id;

        if (!($list === "")) {
            $params["owner_screen_name"] = $screen_name;
        }
    }

    if (isset($_REQUEST['hashtag'])){
        $hashtag = str_replace("#", "%23", htmlspecialchars($_REQUEST['hashtag']));

        // make sure there is a hashtag symbol
        if(strpos($hashtag, "%23") === 0){
        }else{
            $hashtag = "%23".$hashtag;
        }
        $params["q"] = $hashtag;
    }

    if (isset($_REQUEST['searchterm'])){
        $search = htmlspecialchars($_REQUEST['searchterm']);
        $params["q"] = $search;
    }

    // https://developer.twitter.com/en/docs/tweets/timelines/api-reference/get-statuses-user_timeline
    if (isset($_REQUEST['screen_name'])){
        $screen_name = htmlspecialchars($_REQUEST['screen_name']);
        $params["screen_name"] = $screen_name;
    }
}

$params = [];
getParamsFromRequest($params, $twitterApi->getUser());
$twitterApi->setParamsFromArray($params);

// todo: everything here should be using the TwitterApi class so the same class is used internally in PHP and over HTTP

try {
    switch ($callis) {
        case "mutedids":
            // https://developer.twitter.com/en/docs/accounts-and-users/mute-block-report-users/api-reference/get-mutes-users-ids
            //$response = $twitterApi->getConnection()->get("mutes/users/ids");
            $response = $twitterApi->getApiMutedIds();
            exit_if_errors($response);
            //$response = $connection->get("statuses/home_timeline");
            $jsonResponse = new StdClass();
            $jsonResponse->ids = $response->ids;
            echo json_encode($jsonResponse);
            //todo handle pages and cursors if too many
            break;
        case "ratelimits":
            $response = $twitterApi->getRateLimits();
            exit_if_errors($response);
            echo json_encode($response);
            break;
        case "usertimeline":
            $response = $twitterApi->getUserTimeline();
            exit_if_errors($response);
            echo json_encode($response);
            break;
        case "hometimeline":
            $response = $twitterApi->getHomeTimeline();
            exit_if_errors($response);
            echo json_encode($response);
            break;
        case "listtimeline":
            $response = $twitterApi->getListTimeline();
            exit_if_errors($response);
            echo json_encode($response);
            break;
        case "search":
            $response = $twitterApi->getSearchTimeline();
            exit_if_errors($response);
            echo json_encode($response);
            break;
        default:
            http_response_code(501);
            echo(json_encode(array("content"=>"", "error"=>"unrecognised api call name ".$callis)));
            break;
    }
}catch(Exception $e){
    http_response_code(502);
    echo(json_encode($e));
    echo(json_encode(array("content"=>"", "error"=>$e->getMessage())));
    exit();
}

// todo: route to different calls for different params
//$statuses = $connection->get($api_call, $params);

?>