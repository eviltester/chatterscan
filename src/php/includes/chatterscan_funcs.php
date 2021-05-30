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

function auto_redirect(){
    echo("<p>You will be redirected automatically to the login form in <span id='redirectseconds'>10</span> seconds.");
    echo("<script>setInterval(function(){var elem=document.getElementById('redirectseconds');elem.innerText=parseInt(elem.innerText)-1;}, 1000);</script>");
    echo("<script>setTimeout(function(){window.location.href=location.protocol + '//' + location.host}, 10000);</script>");
}

function auto_retry(){
    echo("<p>We will refresh the page in <span id='retryseconds'>10</span> seconds.");
    $url =  "//{$_SERVER['HTTP_HOST']}{$_SERVER['REQUEST_URI']}";
    echo("<p><a href='" . $url . "'>click here to refresh now</a></p>");
    echo("<script>setInterval(function(){var elem=document.getElementById('retryseconds');elem.innerText=parseInt(elem.innerText)-1;}, 1000);</script>");
    echo("<script>setTimeout(function(){window.location.reload();}, 10000);</script>");
}

function retry_based_on_twitter_exception($e){
    echo "<div class='page-content'>";
    require "includes/header.php";
    echo '<p>We encountered a Twitter exception: ',  $e->getMessage(), "</p>";
    auto_retry();
    require "includes/footer.php";
    echo '</body></html';
    exit();
}

function retry_based_on_twitter_exception_later($e){
    echo '<p>We encountered a Twitter exception: ',  $e->getMessage(), "</p>";
    auto_retry();
    require "includes/footer.php";
    echo '</body></html';
    exit();
}

function exit_if_oauth_error($returned_data){
// if the twitter provided an error then print it out and show user link to login
    if(isset($returned_data->errors)){

        echo("<h1>".$returned_data->errors[0]->message."</h1>");
        echo("<h2><a href='/oauthredirect.php'>Click here to Authorise the app to access your Twitter Feed</a></h2>");
        auto_redirect();
        require "includes/footer.php";
        echo("</body></html>");
        exit();
    }
}

function show_logout_link(){
    echo '<div class="logout"><a href="/logout.php">Logout</a></div>';
}

function echo_twitter_user_details($user){
//print_r($user);
    $urlHandler = new CurrentURLParams;
    $params = $urlHandler->getParams();

    if($params==null || strlen($params)==0){
        $params = "?";
    }

    echo "<p><img src='brand-resources/twitter/twitter_logo_blue_32x32.png'/> $user->name : @$user->screen_name</p>";

    echo "<div id='mainfeedmenu'>";
    $prefix = "<ul><li>";
    $postfix = "</li></ul>";
    $tpre = ""; //text prefix
    $tpost=""; // text postfix

    $prefix = " ";
    $postfix = " ";
    $tpre = "<button class='pure-button'>";
    $tpost="</button>";

    echo "<script>function toggleDiv(aDivId){var divvy = document.getElementById(aDivId); if(divvy==null){return;} divvy.style.display = (divvy.style.display !== 'block') ? 'block' : 'none';}</script>";
    echo "<script>function toggleButton(aButton){aButton.style.backgroundColor = (aButton.style.backgroundColor.length<5) ? \"#9e9e9e\" : \"\"}</script>";

    echo "View: ";
    echo $prefix."<a href='mainview.php".$params."'>".$tpre."Main Feed".$tpost."</a>".$postfix;
    echo $prefix."<a href='lists.php".$params."'>".$tpre."List".$tpost."</a>".$postfix;
    echo $prefix."<a href='favourites.php".$params."'>".$tpre."Saved Search".$tpost."</a>".$postfix;
    echo $prefix."<a href='#' onclick='";
    echo "var feedname = prompt(\"Type the user Twitter handle to view\");if(feedname!=null){document.location=\"mainview.php".$params."&screen_name=\"+feedname};";
    echo "'>".$tpre."Specific User".$tpost."</a>".$postfix;
    echo " <button id='filtersbutton' class='pure-button' style='display:none' onclick='toggleDiv(\"filterscontrol\");toggleButton(this);'>Filters</button> ";
    echo " <button id='pluginsbutton' class='pure-button' style='display:none'  onclick='toggleDiv(\"pluginscontrol\");toggleButton(this);'>Plugins</button> ";

    echo "<script>window.addEventListener('load', (event) => {if(document.getElementById('filterscontrol')!==null){document.getElementById('filtersbutton').style.display='inline'}});</script>";
    echo "<script>window.addEventListener('load', (event) => {if(document.getElementById('pluginscontrol')!==null){document.getElementById('pluginsbutton').style.display='inline'}});</script>";

    echo " Twitter: ";
    echo " <button class='pure-button' onclick='toggleDiv(\"twitterlinksmenu\");toggleButton(this);'>Links Menu</button> ";
    echo " <button class='pure-button' onclick='toggleDiv(\"twitteradminlinksmenu\");toggleButton(this);'>Admin Links Menu</button> ";
    echo " <button class='pure-button' onclick='toggleDiv(\"twittertoolslinksmenu\");toggleButton(this);'>Tool Links Menu</button> ";
    echo "</div>";

    $twitterLinks = array(
        "Feed"=>"https://twitter.com/home",
        "Notifications"=>"https://twitter.com/i/notifications",
        "Messages"=> "https://twitter.com/messages",
        "Topics"=>"https://twitter.com/".$user->screen_name."/topics",
        "Lists"=>"https://twitter.com/".$user->screen_name."/lists",
        "Profile"=>"https://twitter.com/".$user->screen_name,
        "Moments"=>"https://twitter.com/".$user->screen_name."/moments",
    );

    $twitterAdminLinks = array(
        "Analytics"=>"https://analytics.twitter.com",
        "Settings"=>"https://twitter.com/settings/account",
        "Interests and ads data"=>"https://twitter.com/settings/your_twitter_data/ads",
        "Apps and Sessions"=>"https://twitter.com/settings/applications",
        "Muted Accounts and Words"=>"https://twitter.com/settings/mute",
    );



    echo "<div id='twitterlinksmenu'>";
    echo "Twitter Links:";
    $separator = " ";
    foreach($twitterLinks as $name => $url) {
        echo $separator." <a href='".$url."' class='pure-button' target='_blank'>".$name."</a>";
        $separator = "  ";
    }
    echo "<hr/>";
    echo "</div>";


    echo "<div id='twitteradminlinksmenu'>";
    echo "Twitter Admin Links:";
    $separator = " ";
    foreach($twitterAdminLinks as $name => $url) {
        echo $separator." <a href='".$url."' class='pure-button' target='_blank'>".$name."</a>";
        $separator = "  ";
    }
    echo "<hr/>";
    echo "</div>";

    $twitterTools = array(
        "TwitterListManager"=>"https://twitterlistmanager.com",
        "SocialBlade Trends"=>"https://socialblade.com/twitter/user/".$user->screen_name,
        "Talotics Text Imager"=>"https://www.talotics.com/apps/textimagertool/text-imager-tool/",
        "Talotics TweetStormer"=>"https://www.talotics.com/apps/tweetstormer/tweetstorm-tool/",
        "Zlappo"=>"https://zlappo.com/?via=chatterscan",
        "MetriCool" => "http://mtr.cool/USRRMR"
    );

    echo "<div id='twittertoolslinksmenu'>";
    echo "Tools:";
    $separator = " ";
    foreach($twitterTools as $name => $url) {
        echo $separator." <a href='".$url."' class='pure-button' target='_blank'>".$name."</a>";
        $separator = "  ";
    }
    echo "<hr/>";
    echo "</div>";

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

function get_http_link($display_portion){
    $pos=0;

    try {
        if (strpos($display_portion, 'http://') !== false) {
            $pos = strpos($display_portion, 'http://');
        }

        if (strpos($display_portion, 'https://') !== false) {
            $pos = strpos($display_portion, 'https://');
        }

        if (strpos($display_portion, ' ', $pos) !== false) {
            // ends with the space
            return substr($display_portion, $pos, strpos($display_portion, ' ', $pos) - $pos);
        } else {
            // till end of string
            return substr($display_portion, $pos);
        }
    }catch(Exception $e){
        return "Exception";
    }

    return "";
}



?>