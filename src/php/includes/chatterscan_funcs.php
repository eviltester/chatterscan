<?php

function is_prod_environment(){
    global $DEPLOY_ENVIRONMENT;

    if(!isset($DEPLOY_ENVIRONMENT)){
        return false;
    }

    return ($DEPLOY_ENVIRONMENT==="prod");
}

function getEnvironmentName(){

    global $DEPLOY_ENVIRONMENT;

    if(isset($DEPLOY_ENVIRONMENT)){
        return $DEPLOY_ENVIRONMENT;
    }

    return "dev";
}

function exit_if_oauth_error($returned_data){
// if the twitter provided an error then print it out and show user link to login
    if(isset($returned_data->errors)){

        echo("<h1>".$returned_data->errors[0]->message."</h1>");
        echo("<h2><a href='/oauthredirect.php'>Click here to Authorise the app to access your Twitter Feed</a></h2>");
        require "includes/footer.php";
        echo("</body></html>");
        exit();
    }
}

function show_logout_link(){
    echo '<div><a href="/logout.php">Logout</a></div>';
}

function echo_twitter_user_details($user){
//print_r($user);
    echo "<p><img src='brand-resources/twitter/twitter_logo_blue_32x32.png'/> $user->name : @$user->screen_name</p>";
    echo "<ul><li><a href='lists.php'>Choose a List</a></li></ul>";
    echo "<ul><li><a href='favourites.php'>Choose a Favourite Hashtag or Search Term</a></li></ul>";
    echo "<hr/>";
}

function access_app_button($buttonText){
    print <<<EOD
<span class="button-access-app"><p><a class="button-access-app pure-button" href="oauthredirect.php">$buttonText</a></p></span>
EOD;

}

function getBooleanValueFromParam($paramName){
    $initialVal = htmlspecialchars($_REQUEST[$paramName]);
    return ($initialVal === 'true');
}

function getTextForBooleanValue($aBooleanVal){
    if($aBooleanVal){
        return "true";
    }

    return "false";
}

function it_contains_http_link($display_portion){
    if (strpos($display_portion, 'http://') !== false){
        return true;
    }

    if (strpos($display_portion, 'https://') !== false){
        return true;
    }

    return false;
}


?>