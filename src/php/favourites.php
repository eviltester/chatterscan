<?php
session_start();
require "config/config.php";
require "includes/chatterscan_funcs.php";
require "config/env/".getEnvironmentName()."/oauthconfig.php";
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

?>

<p>Favourites are stored locally in your browser local storage. If you use a different browser to access ChatterScan then you will not see your favourites listed here and will have to recreate them.</p>

<h2>Favourite HashTags</h2>

<p><button onclick="addHashTag()">Add HashTag</button></p>

<div>
    <ul id="hashtagslist">

    </ul>
</div>

<h2>Favourite Searches</h2>

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
        <a href="mainview.php?${actionName}=${encodedTerm}" data-id="${arrayindex}">${term}</a>
`;

    var thePostLiWithDeleteButton = `
        <button onclick="${deleteFunctionName}(${arrayindex})">Delete</button>
        &nbsp;
        <form action="mainview.php" method="POST">
            <input type="hidden" name="${actionName}" value="${encodedTerm}">
            <button class="button-next-page pure-button" type="submit" value="View Favourite">${term}</button>
        </form>
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
