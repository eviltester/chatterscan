<?php

require_once "config/env/".getEnvironmentName()."/oauthconfig.php";
require_once "twitteroauth-0.7.4/autoload.php";

use Abraham\TwitterOAuth\TwitterOAuth;

// move all twitter api code into here to start creating a JS accessible twitter api

class TwitterApiCallEndPoint{

    public $api_call_endpoint="";
    public $api_display_name="";

}



// see https://twitteroauth.com/callback.php


class TwitterApi{

    private $access_token;
    private $user;
    private $connection;
    private $showing_list;
    public $twitter_params;


    function __construct($access_token) {
        $this->access_token = $access_token;
    }

    function connect(){
        $this->connection = new TwitterOAuth(
                                CONSUMER_KEY,
                                CONSUMER_SECRET,
                                            $this->access_token['oauth_token'],
                                            $this->access_token['oauth_token_secret']);

        $this->user=null;

        $this->user = $this->connection->get("account/verify_credentials");

        $numberToShow=100;

        $this->twitter_params = ["count" => $numberToShow, "tweet_mode" => "extended"];
    }

    function getConnection(){
        return $this->connection;
    }

    function getUser(){
        return $this->user;
    }

    function getShowingList(){
        return $this->showing_list;
    }

    function setParamsFromArray($additionalParams){
        $this->twitter_params = array_merge($this->twitter_params, $additionalParams);
    }

    function makeCallBasedOnFilters($chatterScanFilters){

        $api_call_config = $this->getApiCallConfigFromFilter($chatterScanFilters);
        $statuses = $this->connection->get($api_call_config->api_call_endpoint, $this->twitter_params);
        return $statuses;
    }

    function setParamsFromFilters($chatterScanFilters){

        $this->twitter_params["exclude_replies"] = $chatterScanFilters->ignore_replies;
        $this->twitter_params["include_rts"] = !$chatterScanFilters->ignore_retweets;
    }

    function getApiMutedIds(){
        $this->showing_list = "Show Muted User Ids";
        return $this->connection->get("mutes/users/ids");
    }

    function getRateLimits(){
        $this->showing_list = "Show Rate Limits";
        return $this->connection->get("application/rate_limit_status");
    }

    function getUserTimeLine(){
        $api_call = "statuses/user_timeline";
        $this->showing_list = "Showing User Feed";
        $statuses = $this->connection->get($api_call, $this->twitter_params);
        return $statuses;
    }

    function getHomeTimeLine(){
        $api_call = "statuses/home_timeline";
        $this->showing_list = "Showing Home Feed";
        $statuses = $this->connection->get($api_call, $this->twitter_params);
        return $statuses;
    }

    function getListTimeLine(){
        $api_call = "lists/statuses";
        $this->showing_list = "Showing List";
        $statuses = $this->connection->get($api_call, $this->twitter_params);
        return $statuses;
    }


    function getSearchTimeline(){
        $api_call = "search/tweets";
        $this->showing_list = "Showing Search Term";
        $statuses = $this->connection->get($api_call, $this->twitter_params);
        return $statuses;
    }

    function getApiCallConfigFromFilter($chatterScanFilters){

        $apiCallConfig = new TwitterApiCallEndPoint();

        // defaults unless otherwise filtered
        $api_call = "statuses/home_timeline";
        $this->showing_list = "Showing Home Feed";

        if($chatterScanFilters->is_using_list()){
            $api_call = "lists/statuses";
            $this->showing_list = "Showing List - $chatterScanFilters->list";
        }

        if($chatterScanFilters->is_screen_name()){
            $api_call = "statuses/user_timeline";
            $this->showing_list = "Showing User Feed - $chatterScanFilters->screen_name";
        }

        if($chatterScanFilters->is_hashtag_search()){
            $api_call = "search/tweets";
            $displayHashTag = str_replace("%23", "#", $chatterScanFilters->hashtag);
            $this->showing_list = "Showing HashTag - $displayHashTag";
        }

        if($chatterScanFilters->is_search()){
            $api_call = "search/tweets";
            $displaySearchTerm = urldecode($chatterScanFilters->search);
            $this->showing_list = "Showing Search Term - $displaySearchTerm";
        }

        $apiCallConfig->api_call_endpoint = $api_call;
        $apiCallConfig->api_display_name = $this->showing_list;

        return $apiCallConfig;
    }
}

?>