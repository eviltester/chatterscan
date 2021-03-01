<?php
session_start();
require "config/config.php";
require "includes/chatterscan_funcs.php";
require "includes/debug_functions.php";
require "includes/filters.php";
require "config/env/".getEnvironmentName()."/oauthconfig.php";
require "config/env/".getEnvironmentName()."/debugconfig.php";
?>
    <html>
    <head>
        <title>Favourite Hashtags and Terms| ChatterScan</title>
        <?php
        require "includes/metatags.php";
        $metatags["description"] = "Show tweets from favourite hashtags and search terms.";
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


echo "<script>var username = '@$user->screen_name';</script>";
// use javascript to show a list of hashtags


function startsWith ($string, $startString)
{
    $len = strlen($startString);
    return (substr($string, 0, $len) === $startString);
}

try{


    $api_call = "saved_searches/list";
    $params = [];
    $returnedSavedSearchesData = $connection->get($api_call, $params);

    $urlHandler = new CurrentURLParams;
    $urlParams = $urlHandler->getParams();

    if($urlParams==null || strlen($urlParams)==0){
        $urlParams = "?";
    }

    debug_var_dump_pre("Twitter Saved Searches", $returnedSavedSearchesData);

    echo "<h2>Twitter Saved Searches</h2>";
    echo "<p><a href='https://help.twitter.com/en/using-twitter/saving-searches' target='_blank'>twitter help</a></p>";
    echo "<ul>";

    $namedSearch = array();
    $originalNamedSearch = array();

    foreach ($returnedSavedSearchesData as $twitterSavedSearch) {
        $encodedTerm = urlencode($twitterSavedSearch->query);
        $visibleTerm = strtolower($twitterSavedSearch->name);
        $originalNamedSearch[$visibleTerm]=$twitterSavedSearch->name;
        $namedSearch[$visibleTerm] = $encodedTerm;
    }
    ksort($namedSearch);

//    echo "<!-- ";
//    foreach ($namedSearch as $key => $value) {
//        $encodedTerm = $value;
//        $visibleTerm = $key;
//        $displayTerm = $originalNamedSearch[$key];
//        echo " - ".$displayTerm." x ".$encodedTerm;
//    }
//    echo " -->";

//    foreach ($returnedSavedSearchesData as $twitterSavedSearch) {
//        $encodedTerm = urlencode($twitterSavedSearch->query);
//        $visibleTerm = $twitterSavedSearch->name;

    foreach ($namedSearch as $key => $value) {
        $encodedTerm = $value;
        $keyTerm = $key;
        $visibleTerm = $originalNamedSearch[$key];

        $buttonHTML="<button class='button-next-page pure-button' value='View Favourite'>$visibleTerm</button>";
        echo "<li>";
        /*
        echo "<form action='mainview.php' method='POST'>";
            echo "<input type='hidden' name='searchterm' value='$encodedTerm'>";
            echo $buttonHTML;
        echo"</form>";
        */
        $searchType = "searchterm";
        $instagramTerm = $encodedTerm;
        if(startsWith($encodedTerm,"#") || startsWith($encodedTerm,"%23")){
            $searchType = "hashtag";
        }

        echo "<a href='mainview.php$urlParams&$searchType=$encodedTerm' target='_blank'>$buttonHTML</a>";

        echo "<ul><li>";

        echo " on ";
        echo " <a href='https://twitter.com/search?q=$encodedTerm&src=typed_query' target='_blank'>[Twitter]</a>";
        echo " <a href='https://www.linkedin.com/search/results/content/?keywords=$encodedTerm' target='_blank'>[LinkedIn]</a>";
        echo " <a href='https://www.facebook.com/search/top/?q=$encodedTerm' target='_blank'>[Facebook]</a>";
        echo " <a href='https://news.google.com/search?q=$encodedTerm' target='_blank'>[Google News]</a>";
        echo " <a href='https://www.reddit.com/search/?q=$encodedTerm&sort=new' target='_blank'>[Reddit]</a>";
        echo " <a href='https://hackernoon.com/search?query=$encodedTerm' target='_blank'>[HackerNoon]</a>";
        echo " <a href='https://hn.algolia.com/?dateRange=all&page=0&prefix=false&query=$encodedTerm&sort=byDate&type=story' target='_blank'>[HackerNews]</a>";

        echo "</li>";

        $showTag = false;
        if(startsWith($encodedTerm,"#")){
            $instagramTerm = substr($encodedTerm, 1);
            $showTag=true;
            $showTag=true;
        }
        if(startsWith($encodedTerm,"%23")){
            $instagramTerm = strtolower(substr($encodedTerm, 3));
            $showTag=true;
        }
        if($showTag){
            echo "<li>";
            echo " Tags: ";
            echo " <a href='https://www.linkedin.com/feed/hashtag/$instagramTerm' target='_blank'>[#LinkedIn]</a>";
            echo " <a href='https://www.instagram.com/explore/tags/$instagramTerm' target='_blank'>[#Instagram]</a>";
            echo " <a href='https://news.google.com/search?q=$instagramTerm' target='_blank'>[GN]</a>";
            echo " <a href='https://www.reddit.com/search/?q=$instagramTerm&sort=new' target='_blank'>[Reddit]</a>";
            echo " <a href='https://hackernoon.com/search?query=$instagramTerm' target='_blank'>[HackerNoon]</a>";
            echo " <a href='https://hn.algolia.com/?dateRange=all&page=0&prefix=false&query=$instagramTerm&sort=byDate&type=story' target='_blank'>[HackerNews]</a>";
            echo "</li>";
        }

        echo "</ul></li>";
    }
    echo "</ul>";
/*
        <form action="mainview.php" method="POST">
            <input type="hidden" name="${actionName}" value="${encodedTerm}">
            <button class="button-next-page pure-button" type="submit" value="View Favourite">${term}</button>
        </form>
 */


}catch(Exception $e){
    echo "<!-- ".$e." -->";
}

?>



<hr/>

<p>Favourites are stored locally in your browser local storage. If you use a different browser to access ChatterScan then you will not see your favourites listed here and will have to recreate them.</p>

<h2>Local Favourite HashTags</h2>

<p><button onclick="addHashTag()">Add HashTag</button></p>

<div>
    <ul id="hashtagslist">

    </ul>
</div>

<h2>Local Favourite Searches</h2>

<p><button onclick="addSearchTerm()">Add Search Term</button></p>

<div>
    <ul id="searchtermslist">

    </ul>
</div>

<script>

var localStorageHashTagKey = "chatterscan.hashtags."+username;
var localStorageSearchTermKey = "chatterscan.searchterms."+username;

var hashtags = [];
var searchterms = [];

function addToList(promptText, theArray){
    var theValue = prompt(promptText);
    theArray.push(theValue);
    return theValue;
}

function addHashTag(){
    var theValue = addToList("Enter Hashtag", hashtags)
    addHashTagToList(theValue, hashtags.length-1);
    storeHashTags();
}

function addSearchTerm(){
    var theValue = addToList("Enter Search Term", searchterms)
    addSearchTermToList(theValue, searchterms.length-1);
    storeSearchTerms();
}

function storeArrayLocally(storageKey, theArray){
    if(localStorage){
        localStorage.setItem(storageKey, JSON.stringify(theArray));
    }
}

function storeHashTags(){
    storeArrayLocally(localStorageHashTagKey, hashtags);
}

function storeSearchTerms(){
    storeArrayLocally(localStorageSearchTermKey, searchterms);
}

// https://stackoverflow.com/questions/16232915/copying-an-array-of-objects-into-another-array-in-javascript
function loadArrayFromLocal(storageKey, theArray){
    if(localStorage && localStorage[storageKey]){
        var storageArray = JSON.parse(localStorage.getItem(storageKey));
        theArray.push.apply(theArray, storageArray);
    }
}

function loadHashTagsFromStorage(){
    loadArrayFromLocal(localStorageHashTagKey, hashtags);
}

function loadSearchTermsFromStorage(){
    loadArrayFromLocal(localStorageSearchTermKey, searchterms);
}

function clearULwithId(anId){
    var ul = document.getElementById(anId);
    while( ul.firstChild ){
        ul.removeChild( ul.firstChild );
    }
}

function clearHashTagsList(){
    clearULwithId("hashtagslist");
}
function clearSearchTermsList(){
    clearULwithId("searchtermslist");
}

function deleteHashTag(arrayindex){
    hashtags.splice(arrayindex, 1);
    storeHashTags();
    clearHashTagsList();
    renderHashTags();
}

function deleteSearchTerm(arrayindex){
    searchterms.splice(arrayindex, 1);
    storeSearchTerms();
    clearSearchTermsList();
    renderSearchTerms();
}

// http://wesbos.com/template-strings-html/

function addHashTagToList(hashName, arrayindex){

    addFaveToList("hashtagslist", "deleteHashTag", "hashtag", hashName, arrayindex);
}

function addFaveToList(listId, deleteFunctionName, actionName, term, arrayindex){

    var encodedTerm = encodeURIComponent(term);

    var ul = document.getElementById(listId);

    var theLiWithDeleteButton = `
        <button onclick="${deleteFunctionName}(${arrayindex})">Delete</button>
        &nbsp;
        <a href="mainview.php?${actionName}=${encodedTerm}" data-id="${arrayindex}" target='_blank'>${term}</a>
`;

    var thePostLiWithDeleteButton = `
        <button onclick="${deleteFunctionName}(${arrayindex})">Delete</button>
        <!--&nbsp;
        <form action="mainview.php" method="POST">
            <input type="hidden" name="${actionName}" value="${encodedTerm}">
            <button class="button-next-page pure-button" type="submit" value="View Favourite">${term}</button>
        </form>
        -->
        <a href='mainview.php?searchterm=${encodedTerm}'><button class="button-next-page pure-button" type="submit" value="View Favourite">${term}</button></a>
`;


    var li = document.createElement("li");
    li.innerHTML = thePostLiWithDeleteButton;

    ul.appendChild(li);

}

function addSearchTermToList(searchTerm, arrayindex){
    addFaveToList("searchtermslist", "deleteSearchTerm", "searchterm", searchTerm, arrayindex);
}

function renderHashTags(){
    var numberOfHashtags = hashtags.length;
    for (var i = 0; i < numberOfHashtags; i++) {
        addHashTagToList(hashtags[i], i);
    }
}

function renderSearchTerms(){
    var numberOfSearchTerms = searchterms.length;
    for (var i = 0; i < numberOfSearchTerms; i++) {
        addSearchTermToList(searchterms[i], i);
    }
}

loadHashTagsFromStorage();
renderHashTags();
loadSearchTermsFromStorage();
renderSearchTerms();


// TODO: create a bulkAddHashTags function that takes an array
// TODO: create a jsBackupButton which outputs the code to recreate to the console
// TODO: create a repopulate bookmarklet link


</script>


<?php


require "includes/footer.php";

// end page content
echo "</div>";

?>

</body>
</html>
