<?php
require "twitteroauth-0.7.4/autoload.php";

use Abraham\TwitterOAuth\TwitterOAuth;

// see https://twitteroauth.com/callback.php

require "config/config.php";
require "includes/chatterscan_funcs.php";
require "config/env/".getEnvironmentName()."/oauthconfig.php";



session_start();


$request_token = [];
$request_token['oauth_token'] = $_SESSION['oauth_token'];
$request_token['oauth_token_secret'] = $_SESSION['oauth_token_secret'];

if (isset($_REQUEST['oauth_token']) && $request_token['oauth_token'] !== $_REQUEST['oauth_token']) {
    // Abort! Something is wrong.
    exit("Oauth login not correct ".$request_token['oauth_token'].'...|...'.$_REQUEST['oauth_token']);
}

try{
$connection = new TwitterOAuth(CONSUMER_KEY, CONSUMER_SECRET, $request_token['oauth_token'], $request_token['oauth_token_secret']);

$access_token = $connection->oauth("oauth/access_token", ["oauth_verifier" => $_REQUEST['oauth_verifier']]);

$_SESSION['access_token'] = $access_token;

header('Location: mainview.php');

}catch(Exception $e){


    print <<<EOD
<html>
    <head>
        <title>Showing Tweets with links | ChatterScan</title>
EOD;

require "includes/metatags.php";

$metatags["description"] = "Showing the tweets from your home feed or list that contain links and valuable information only.";
outputMetaTags();

require "config/env/".getEnvironmentName()."/ga.php";

    print <<<EOD
</head>
<body>
EOD;

    require "includes/header.php";

    echo('<h1>You need to Authorise the app correctly</h1>');

    echo($e->getMessage());

    echo("<h2><a href='oauthredirect.php'>Click here to Authorise the app to access your Twitter Feed</a></h2>");
    require "includes/footer.php";

    print <<<EOD

</body>
</html>
EOD;
}
?>