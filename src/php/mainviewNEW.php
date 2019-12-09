<?php
session_start();
require "config/config.php";
require "includes/chatterscan_funcs.php";
require "includes/TweetRendererClass.php";
require "config/env/".getEnvironmentName()."/oauthconfig.php";
require "includes/debug_functions.php";
require "config/env/".getEnvironmentName()."/debugconfig.php";
require "includes/TweetRepresentationClass.php";
?>
<html>
<head>
    <title>Showing Tweets with links | ChatterScan</title>
    <?php
    require "includes/metatags.php";
    $metatags["description"] = "Showing the tweets from your home feed or list that contain links and valuable information only.";
    outputMetaTags();
    ?>

    <?php
    // only bring in analytics if first request when no params in url
    if(count($_GET) == 0){
        require "config/env/" . getEnvironmentName() . "/ga.php";
    }
    ?>

    <script>
        function searchForHighlightedText(allowEdit=false){
            var selectedText = "";
            try{
                selectedText = document.getSelection().anchorNode.data.substr(document.getSelection().anchorOffset, document.getSelection().focusOffset-document.getSelection().anchorOffset);
            }catch(err){
                // ignore
            }
            if(selectedText.trim().length>0){
                searchForTerm(allowEdit, selectedText);
            }else{
                alert("Select some text in the tweet and then you can click the 'go sel' button to search for it. 'edit sel' will let you edit the selection prior to searching for it.");
            }
        }
        function searchForTerm(allowEdit=false,chosenTerm=""){
            var selectedText = chosenTerm;
            if(allowEdit){
                newSelectedText = prompt("Search Term", selectedText);
                if(newSelectedText===null || newSelectedText.valueOf() == selectedText.valueOf()){
                    return;
                }
                selectedText=newSelectedText;
            }
            var searchTerm = encodeURIComponent(selectedText);
            window.open(window.location.href.split("?")[0]+"?searchterm="+searchTerm);
        }
    </script>
</head>

<body>
<?php
require "twitteroauth-0.7.4/autoload.php";

use Abraham\TwitterOAuth\TwitterOAuth;


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


$numberToShow=100;

$params = ["count" => $numberToShow, "exclude_replies" => true, "tweet_mode" => "extended", "include_rts" => false];

$extra_params = [];


$markdownOutput="";
$hiddenmarkdownOutput="";

require "includes/filters.php";

$pageNamePHP = $_SERVER['PHP_SELF'];
$filters->setNextUrl($pageNamePHP);

$filters->setFiltersFromRequest($params, $extra_params, $user->screen_name);

debug_var_dump_pre("DEBUG: Filters From Request", $filters);


$apiCallConfig = $filters->getApiCallConfigFromFilter();
$api_call = $apiCallConfig->api_call_endpoint;
$showing_list = $apiCallConfig->api_display_name;



debug_var_dump_pre("DEBUG: Twitter API Request", $params);

// https://stackoverflow.com/questions/38717816/twitter-search-api-text-field-value-is-truncated
// tweet_mode extended to get full_text
$statuses = $connection->get($api_call, $params);
//debug_var_dump_pre("DEBUG: TWitter Response", $statuses);

// response format is different for a search - we need to get statuses from the response
if($filters->is_hashtag_search() || $filters->is_search()){
    $statuses = $statuses->statuses;
    // debug_var_dump_pre("DEBUG: TWitter Response", $statuses);
}

$filters->echo_filters_menu($extra_params);


echo "<details><summary>Plugins</summary><div id='header-plugins-section'></div></details>";

echo "<div class='tweets-section'>";

echo "<div id='next-button-placemarker'></div>";

$editButtonHTML = "";
if($filters->is_search()) {
    $editButtonHTML = " <button onclick='searchForTerm(true,decodeURIComponent(\"".
                        $filters->search.
                        "\"))'>Edit Search</button>";
}
$displayListTitleHTML = "<h1>".$showing_list."</h1>".
                        "<p style='text-align: center;'>".$editButtonHTML."</p>";

echo $displayListTitleHTML;

// https://developer.twitter.com/en/docs/tweets/data-dictionary/overview/tweet-object
$first_id=0;
$max_id=0;
$ignore=false;
$shown_count=0;
$number_processed=0;
$twitter_error=false;

$hidden_retweet_ignore_count=0;
$hidden_possibly_sensitive_count=0;
$hidden_no_links_count=0;
$hidden_has_links_count=0;

// allow seeing hidden tweets
$hidden_retweet_ignore_html="";
$hidden_possibly_sensitive_html="";
$hidden_no_links_html="";
$hidden_has_links_html="";

if(is_null($statuses)){
    goto endProcessingStatuses;
}

$twitterResponse = new TwitterResponse();
$twitterResponse->fromResponse($statuses);

if($twitterResponse->isError){
    $twitter_error=true;
    echo "<h2>Sorry, Twitter says - ".$twitterResponse->errorMessage." Code: ".$twitterResponse->errorCode."</h2>";
    echo "<p>Home feed is limited to 15 requests in 15 minutes by Twitter - try using a list view instead.</p>";
    // TODO - make a call here to the rate limiting api and describe the limits
    // https://developer.twitter.com/en/docs/developer-utilities/rate-limit-status/api-reference/get-application-rate_limit_status
    debug_var_dump_as_html_comment("Twitter reported an error", $statuses);
    $max_id = $twitterResponse->maxIdOnError;
    goto endProcessingStatuses;
}

$tweetRenderer = new TweetRenderer();
$tweetRenderer->forUserHandle($user->screen_name);
$tweetRenderer->mainPage($pageNamePHP);

foreach ($twitterResponse->statuses as $value){

    $debug_info = [];

    debug_var_dump_as_html_comment("Tweet Data that is about to be processed", $value);


    $hidden_retweet_ignore=false;
    $hidden_possibly_sensitive=false;
    $hidden_no_links=false;
    $hidden_has_links=false;

    if($filters->only_include_retweets){
        // if it is not a retweet then ignore
        if(!$value->is_quote_status){
            $ignore=true;
            $debug_info["only_include_retweets"] = "Ignored because we only want retweets but is_quote_status was false";
            $hidden_retweet_ignore=true;
        }else{
            $debug_info["only_include_retweets"] = "is_quote_status was true, so this was included";
        }
    }

    if($filters->ignore_retweets){
        // if it is a retweet then ignore
        if($value->is_quote_status){
            $ignore=true;
            $debug_info["ignore_retweets"] = "Ignored because is_quote_status reported tweet as a quote";
            $hidden_retweet_ignore=true;
        }else{
            $debug_info["ignore_retweets"] = "Included because is_quote_status reported tweet as not being a quote";
        }
    }

    // if it is possibly sensitive then ignore
    // supposed to only be set if tweet has a link - but that isn't true
    if(isset($value->possibly_sensitive)){
        if($value->possibly_sensitive) {
            $ignore = true;
            $debug_info["possibly_sensitive"] = "Ignored because Marked as possibly_sensitive";
            $hidden_possibly_sensitive=true;
        }else{
            $debug_info["possibly_sensitive"] = "Included because not Marked as possibly_sensitive";
        }
    }


    array_merge($debug_info, $value->debug_info);


    // if it does not include http
    if (!$value->containsHttpLink()) {
        $debug_info["included http?"] = "It did not include http";
        if(!$filters->include_without_links) {
            $ignore = true;
            $debug_info["include_without_links"] = "IGNORED we are set to not include_without_links";
            $hidden_no_links=true;
        }else{
            $debug_info["include_without_links"] = "SHown we are set to include_without_links";
        }
    }else{
        // it does include links
        $debug_info["included http?"] = "It did include an http";
        if(!$filters->include_links){
            $ignore=true;
            $debug_info["include_links"] = "IGNORE: EXCLUDE LINKS !include_links";
            $hidden_has_links=true;
        }else{
            $debug_info["include_links"] = "SHOWN: allowed to include_links";
        }
    }

    // decision - show full tweet instead (20190618) but make decision about link if it is in display range
    $display_portion = $value->full_text;


    $tweetRenderer->tweetToRender($value);

    $tweet_link_url = $tweetRenderer->getTweetLinkURL();

    $debug_info["tweet_link_url"] = $tweet_link_url;

    // $hidden_retweet_ignore=false;
    // $hidden_possibly_sensitive
    // $hidden_no_links=false;
    // $hidden_has_links=false;


    $displayTweetHTML = $tweetRenderer->getTweetAsHTML();



    if($ignore===false) {


        $linkInTweet = get_http_link($display_portion);

        if(strlen(trim($linkInTweet))>0)
        {
            $htmlLinkInTweet = "<a href='$linkInTweet' target='_blank'>$linkInTweet</a>";
            $markdownOutput = $markdownOutput."\n* [$display_portion]($linkInTweet) [-]($tweet_link_url)";
            $displayTweetHTML = str_replace($linkInTweet,$htmlLinkInTweet,$displayTweetHTML);
        }

        echo $displayTweetHTML;
        $shown_count++;

        $debug_info["tweet_shown_state"] = "VIABLE - TWEET WAS SHOWN";




    }else{

        $hiddenmarkdownOutput = $hiddenmarkdownOutput."\n* [$display_portion]($tweet_link_url)";
        // $hidden_retweet_ignore=false;
        // $hidden_possibly_sensitive
        // $hidden_no_links=false;
        // $hidden_has_links=false;
        if($hidden_retweet_ignore){
            $hidden_retweet_ignore_html=$hidden_retweet_ignore_html.$displayTweetHTML;
            $hidden_retweet_ignore_count++;
        }
        if($hidden_possibly_sensitive) {
            $hidden_possibly_sensitive_html = $hidden_possibly_sensitive_html.$displayTweetHTML;
            $hidden_possibly_sensitive_count++;
        }
        if($hidden_no_links) {
            $hidden_no_links_html = $hidden_no_links_html.$displayTweetHTML;
            $hidden_no_links_count++;
        }
        if($hidden_has_links) {
            $hidden_has_links_html = $hidden_has_links_html.$displayTweetHTML;
            $hidden_has_links_count++;
        }


        debug_echo("Ignored Tweet: ".$value->id." ".$tweet_link_url);
        $debug_info["tweet_shown_state"] = "IGNORED - TWEET NOT SHOWN";
    }

    debug_var_dump_as_html_comment("Tweet debug info", $debug_info);

    $max_id = $value->id;
    $ignore=false;
    $number_processed++;
}

endProcessingStatuses:

// end tweets section for css styling
echo "</div>";

echo "\n<!--\n";
echo $markdownOutput;
echo "\n-->\n";


function buildNextPageButtonHtml($shown_count, $number_processed, $filters, $extra_params, $max_id){
    $buttonHtml = "";
    $buttonHtml = $buttonHtml."<div class='nextpage'>";
    $buttonHtml = $buttonHtml."<p>$shown_count/$number_processed</p>";
    $buttonHtml = $buttonHtml.$filters->buildButtonOrLink_including($extra_params,"from_tweet_id",$max_id, "Next Page");
    $buttonHtml = $buttonHtml."</div>";
    return $buttonHtml;
}


function showNextPageButton($shown_count, $number_processed, $filters, $extra_params, $max_id){
    echo buildNextPageButtonHtml($shown_count, $number_processed, $filters, $extra_params, $max_id);
//    echo "<div class='nextpage'>";
//    echo "<p>$shown_count/$number_processed</p>";
//    $filters->showButtonOrLink_including($extra_params,"from_tweet_id",$max_id, "Next Page");
//    echo "</div>";
}

showNextPageButton($shown_count, $number_processed, $filters, $extra_params, $max_id);

// show a button at the top of the page
$buttonHtml = buildNextPageButtonHtml($shown_count, $number_processed, $filters, $extra_params, $max_id);
$buttonHtml = str_replace("\n", " ", $buttonHtml);
echo "<script>document.getElementById('next-button-placemarker').innerHTML=\"$buttonHtml\"</script>";


echo "<br/><br/><details><summary>View Any Available Hidden Tweets</summary>";
if(strlen($hidden_retweet_ignore_html)>0){
    echo "<details><summary>Retweets Tweets</summary>";
    echo $hidden_retweet_ignore_html;
    showNextPageButton($hidden_retweet_ignore_count, $number_processed, $filters, $extra_params, $max_id);
    echo "</details>";
}
if(strlen($hidden_no_links_html)>0) {
    echo "<details><summary>No Link in Tweets</summary>";
    echo $hidden_no_links_html;
    showNextPageButton($hidden_no_links_count, $number_processed, $filters, $extra_params, $max_id);
    echo "</details>";
}
if(strlen($hidden_possibly_sensitive_html)>0){
    echo "<details><summary>Possibly Sensitive Tweets</summary>";
    echo $hidden_possibly_sensitive_html;
    showNextPageButton($hidden_possibly_sensitive_count, $number_processed, $filters, $extra_params, $max_id);
    echo "</details>";
}
if(strlen($hidden_has_links_html)>0) {
    echo "<details><summary>Has Link In Tweets</summary>";
    echo $hidden_has_links_html;
    showNextPageButton($hidden_has_links_count, $number_processed, $filters, $extra_params, $max_id);
    echo "</details>";
}
echo "</details>";

echo "\n<!--\n";
echo $hiddenmarkdownOutput;
echo "\n-->\n";

// TODO: distinguish between error object returned as $user and a user
// error:
// stdClass Object ( [errors] => Array ( [0] => stdClass Object ( [message] => Your credentials do not allow access to this resource [code] => 220 ) ) )
// vs
// stdClass Object ( [id] => 59615969 [id_str] => 59615969 [name] => Alan Richardson [screen_name] => eviltester [location] => London, England, UK ...

echo "<div id='footer-plugins-section'></div>";

require "includes/footer.php";

// end page content
echo "</div>";

// TODO: have a localstorage of localmutedaccounts of twitterhandles
// [x] delete any tweets shown from localmutedaccounts div.atweet[data-from-userhandle='twitterhandle']
// [x] show list of localmutedaccounts - clickable links to the account on twitter to allow management
// [x] refresh localstorage from server
// [x] link to muted account management on twitter
// [x] add button to tweet div to allow muting (locally) the account
// convert this code into a 'plugin' to not release with main code
// [x] add a space before the button
// [x] add the button under the header in a plugin header div
// [x] make [mute] button [unmute] when deleted
// [x] remove [mute] button when muted on twitter - add link to the acccount on twitter [unmute on twitter]
?>

<script>



class MutedAccountsStorage {

    constructor(aKey) {
        this.key = aKey;
        this.twitterhandles = [];
        this.getLocalMutedAccounts();
    }

    setArrayContents(newArrayContents){
        this.twitterhandles = Array.from(newArrayContents);
    }

    storeMutedAccounts(){
        this.storeArrayLocally(this.key, this.twitterhandles)
    }

    getLocalMutedAccounts(){
        this.loadArrayFromLocal(this.key, this.twitterhandles)
    }

    storeArrayLocally(storageKey, theArray){
        if(localStorage){
            localStorage.setItem(storageKey, JSON.stringify(theArray));
        }
    }

    addToLocallyMutedTwitterHandles(aHandle){
        this.addToList(aHandle, this.twitterhandles);
        this.storeMutedAccounts();
    }

    addToList(valueToAdd, theArray){
        if(!theArray.includes(valueToAdd)){
            theArray.push(valueToAdd);
        }
        return valueToAdd;
    }

    loadArrayFromLocal(storageKey, theArray){
        if(localStorage && localStorage[storageKey]){
            var storageArray = JSON.parse(localStorage.getItem(storageKey));
            theArray.push.apply(theArray, storageArray);
        }
    }

    isMutedHandle(aHandle){
        return this.twitterhandles.includes(aHandle);
    }

    removeMutedHandle(aHandle){
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter
        this.twitterhandles = this.twitterhandles.filter(handle => handle !== aHandle);
        this.storeMutedAccounts()
    }

    getMutedHandles(){
        return this.twitterhandles;
    }
}

class MutedAccountsGUI {

    constructor(mutedAccountsStorage, mutedIdsStorage) {
        this.storage = mutedAccountsStorage;
        this.idsstorage = mutedIdsStorage;
    }

    deleteTweetsFromMutedAccounts(){
        var mutedAccounts = this.storage.getMutedHandles();
        var numberOfMuted = mutedAccounts.length;
        var i, mutedHandle, divs;
        for (i=0; i<numberOfMuted; i++) {
            mutedHandle = mutedAccounts[i];
            this.deleteTweetsFromHandle(mutedHandle);
        }
    }

    deleteTweetsFromMutedAccountIds(){
        var mutedAccounts = this.idsstorage.getMutedHandles();
        var numberOfMuted = mutedAccounts.length;
        var i, mutedId, divs;
        for (i=0; i<numberOfMuted; i++) {
            mutedId = mutedAccounts[i];
            this.deleteTweetsFromId(mutedId);
        }
    }

    deleteTweetsFromHandle(aHandle){
        var divs = document.querySelectorAll("div.atweet[data-from-userhandle='"+aHandle+"']");
        var insertHere = document.querySelector("#muted-account-tweets");
        for (var divindex=0; divindex<divs.length; divindex++) {
            // delete
            //divs[divindex].parentNode.removeChild(divs[divindex]);
            // move
            insertHere.appendChild(divs[divindex]);
            // unmute
        }
        this.changeMuteButtonTextForHandle(aHandle, "Unmute (local)");

    }

    changeMuteButtonTextForHandle(aHandle, buttonText){
        //make button unmute if in local list
        var buttons = document.querySelectorAll("button.localmute[data-twitterhandle='" + aHandle + "']");
        for (var buttonindex=0; buttonindex<buttons.length; buttonindex++) {
            buttons[buttonindex].innerHTML=buttonText;
        }
    }

    deleteTweetsFromId(anId){
        var divs = document.querySelectorAll("div.atweet[data-from-userid='"+anId+"']");
        var insertHere = document.querySelector("#muted-account-tweets");
        for (var divindex=0; divindex<divs.length; divindex++) {
            // delete
            //divs[divindex].parentNode.removeChild(divs[divindex]);
            // move
            insertHere.appendChild(divs[divindex]);
        }
    }

    restoreMutedTweets(anId, aHandle){
        var allMutedUserIdTweets = "div#muted-account-tweets > div.atweet[data-from-userid='"+anId+"']";
        var allMutedUserHandleTweets = "div#muted-account-tweets > div.atweet[data-from-userhandle='"+aHandle+"']";
        var divs = document.querySelectorAll(allMutedUserIdTweets+","+allMutedUserHandleTweets);
        var insertHere = document.querySelector("div.tweets-section");
        for (var divindex=0; divindex<divs.length; divindex++) {
            insertHere.appendChild(divs[divindex]);
        }
        // change buttons back to "mute (local)"
        this.changeMuteButtonTextForHandle(aHandle, "Mute (local)");
    }

    addMutedPluginSection(){
        var hasButtonAlready = document.querySelector("div#header-plugins-section button.servermutedrefresh");
        if(hasButtonAlready){
            // ignore
        }else {

            var html = `<details><summary>Muted Accounts</summary>
                            <button class='servermutedrefresh'>Get Muted Account Ids From Server</button>
                            <a href="https://twitter.com/settings/muted/all" target="_blank">Twitter: Manage Muted Accounts</a>
                            <details id="local-muted-accounts-list-section">
                                <summary>Local Storage Muted Accounts</summary>
                                <ul id="local-muted-accounts-list"></ul>
                            </details>
                            <details id="server-muted-accounts-list-section">
                                <summary>Server Muted Account Ids</summary>
                                <ul id="server-muted-accounts-list"></ul>
                            </details>
                        </details>
                        `;

            var footerhtml = `<details><summary>Muted Account Tweets</summary>
                            <a href="https://twitter.com/settings/muted/all" target="_blank">Twitter: Manage Muted Accounts</a>
                            <div id="muted-account-tweets"></div>
                        </details>
                        `;

            var header = document.querySelector("div#header-plugins-section").
                insertAdjacentHTML("afterbegin", html);

            var footer = document.querySelector("div#footer-plugins-section").
            insertAdjacentHTML("afterbegin", footerhtml);

            var button = document.querySelector("div#header-plugins-section button.servermutedrefresh");
            button.addEventListener("click", function () {
                mutedAccountsGUI.getMutedIdsFromServer();
                mutedAccountsGUI.refreshServerMutedAccountsList();
                mutedAccountsGUI.deleteTweetsFromMutedAccountIds();
            });

            this.refreshLocalMutedAccountsList();
            this.refreshServerMutedAccountsList();
        }
    }

    refreshLocalMutedAccountsList(){
        var mutedAccounts = this.idsstorage.getMutedHandles();
        var numberOfMuted = mutedAccounts.length;
        var i, mutedHandle, divs;
        var ul = document.querySelector("#server-muted-accounts-list");

        var child = ul.lastElementChild;
        while (child) {
            ul.removeChild(child);
            child = ul.lastElementChild;
        }

        for (i=0; i<numberOfMuted; i++) {
            var mutedAccount= mutedAccounts[i];
            //var html = `<li><a href="https://twitter.com/i/user/50988711">`
            var html = `<li><a href="https://twitter.com/i/user/${mutedAccount}" target="_blank">${mutedAccount}</a></li>`;
            ul.insertAdjacentHTML("afterbegin", html);
        }
    }

    refreshServerMutedAccountsList(){
        var mutedAccounts = this.storage.getMutedHandles();
        var numberOfMuted = mutedAccounts.length;
        var i, mutedHandle, divs;
        var ul = document.querySelector("#local-muted-accounts-list");

        var child = ul.lastElementChild;
        while (child) {
            ul.removeChild(child);
            child = ul.lastElementChild;
        }

        for (i=0; i<numberOfMuted; i++) {
            var mutedAccount= mutedAccounts[i];
            //var html = `<li><a href="https://twitter.com/i/user/50988711">`
            var html = `<li><a href="https://twitter.com/${mutedAccount}" target="_blank">${mutedAccount}</a></li>`;
            ul.insertAdjacentHTML("afterbegin", html);
        }
    }


    replaceMuteButtonWithLink(muteId){

    }

    addMuteButtonsToTweets(){
        var divs = document.querySelectorAll("div.atweet");
        for (var divindex=0; divindex<divs.length; divindex++) {
            var hasButtonAlready = divs[divindex].querySelector("div.tweet-plugins-section button.localmute");
            if(hasButtonAlready){
                // ignore
            }else{

                var div = divs[divindex];
                var muteHandle = div.getAttribute("data-from-userhandle");
                var muteId = div.getAttribute("data-from-userid");

                // if muteId is in the server list then do not add a button
                var useButton=true;
                var html = `<a href="https://twitter.com/i/user/${muteId}" target="_blank">Manage Muting On Twitter</a>`;



                if(mutedAccountIdsStorage.isMutedHandle(muteId)){
                    useButton=false;
                }else{
                    // add button as well for local muting
                    html = `<button class='localmute' data-twitterhandle='${muteHandle}' data-twitteruserid='${muteId}'>Mute (local)</button> `+html;
                }

                //add the html
                var header = divs[divindex].querySelector("div.tweet-plugins-section");
                header.insertAdjacentHTML("afterbegin", html);
                var button = header.firstChild;

                if(useButton) {
                    button.addEventListener("click", function () {
                        var muteThisHandle = this.getAttribute("data-twitterhandle");
                        var muteThisId = this.getAttribute("data-twitteruserid");
                        // if handle exists then we are unmuting it
                        if (mutedAccountsStorage.isMutedHandle(muteThisHandle)) {
                            mutedAccountsStorage.removeMutedHandle(muteThisHandle);
                            // move tweets back into main view if not server muted
                            if(!mutedAccountIdsStorage.isMutedHandle(muteThisId)) {
                                mutedAccountsGUI.restoreMutedTweets(muteThisId, muteThisHandle)
                            }
                        } else {
                            mutedAccountsGUI.deleteTweetsFromHandle(muteThisHandle);
                            mutedAccountsStorage.addToLocallyMutedTwitterHandles(muteThisHandle);
                            mutedAccountsGUI.refreshLocalMutedAccountsList();
                        }
                    });
                }
            }
        }
    }

    getMutedIdsFromServer(){
        const Http = new XMLHttpRequest();
        // const url='twitterapi.php?apicall=mutedids'; as int
        const url='twitterapi.php?apicall=mutedidsstringify';
        Http.open("GET", url);
        Http.send();

        Http.onload = (e) => {
            //console.log(Http.responseText);
            // ISSUE: JSON.parse will change big ids to wrong numbers
            // https://stackoverflow.com/questions/18755125/node-js-is-there-any-proper-way-to-parse-json-with-large-numbers-long-bigint
            var ids = JSON.parse(Http.responseText);
            //var arrayContents = /{"ids":\[(.*)\]}/.exec(Http.responseText);
            //var ids=arrayContents[1].split(",");

            mutedAccountIdsStorage.setArrayContents(ids.ids);
            mutedAccountIdsStorage.storeMutedAccounts();
            mutedAccountsGUI.deleteTweetsFromMutedAccountIds();
        }
    }

}
</script>

<?php

echo "<script>";
echo "var localMutedAccountsKey = 'chatterscan.localmutedaccounts.".$user->screen_name."';";
echo "var mutedAccountsStorage = new MutedAccountsStorage(localMutedAccountsKey);";
echo "var serverMutedAccountsKey = 'chatterscan.serverMutedAccountIds.".$user->screen_name."';";
echo "var mutedAccountIdsStorage = new MutedAccountsStorage(serverMutedAccountsKey);";
// todo this should be a manual refresh action in the plugins
//echo "mutedAccountsGUI.getMutedIdsFromServer();";
echo "var mutedAccountsGUI = new MutedAccountsGUI(mutedAccountsStorage, mutedAccountIdsStorage);";
echo "mutedAccountsGUI.addMutedPluginSection();";
echo "mutedAccountsGUI.deleteTweetsFromMutedAccounts();";
echo "mutedAccountsGUI.deleteTweetsFromMutedAccountIds();";
echo "mutedAccountsGUI.addMuteButtonsToTweets();";


//


echo "</script>";

?>

</body>
</html>
