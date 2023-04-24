<?php
header('Location: favourites.php');
die();
require "twitteroauth-0.7.4/autoload.php";

use Abraham\TwitterOAuth\TwitterOAuth;

require "config/config.php";
require "includes/chatterscan_funcs.php";
require "config/env/".getEnvironmentName()."/oauthconfig.php";

$connection = new TwitterOAuth(CONSUMER_KEY, CONSUMER_SECRET);


// generate a request token
$request_token = $connection->oauth('oauth/request_token', array('oauth_callback' => OAUTH_CALLBACK));

session_start();
$_SESSION['oauth_token'] = $request_token['oauth_token'];
$_SESSION['oauth_token_secret'] = $request_token['oauth_token_secret'];
$_SESSION['refresh_user_id'] = "Y";

$url = $connection->url('oauth/authorize', array('oauth_token' => $request_token['oauth_token']));

header('Location: '.$url);
?>