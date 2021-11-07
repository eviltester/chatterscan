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
    <script src="favourites.js"></script>

    <style>
        #favouritesGui{
            display:flex;
        }
        .search-terms-section{
            margin-right: 2em;
            border-right: black;
            background-color: aliceblue;
            border-style: groove;
            padding-right: 1em;
        }
    </style>
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

    $namedSearch = array();
    $originalNamedSearch = array();

    foreach ($returnedSavedSearchesData as $twitterSavedSearch) {

        $encodedTerm = urlencode($twitterSavedSearch->query);
        $visibleTerm = strtolower($twitterSavedSearch->name);
        $originalNamedSearch[$visibleTerm]=$twitterSavedSearch->name;
        $namedSearch[$visibleTerm] = $encodedTerm;
    }

    ksort($namedSearch);

    $jsonSavedSearches = array();

    $jsonSavedSearchesData = array();
    foreach ($namedSearch as $key => $value) {
        $jsonDataToAdd = array();
        $jsonDataToAdd = array("encodedTerm"=>$value, "visibleTerm"=>$key, "namedSearch" => $originalNamedSearch[$key], "urlParams"=>$urlParams);
        array_Push($jsonSavedSearchesData, $jsonDataToAdd);
    }

    $jsonSavedSearches["twitter"] = $jsonSavedSearchesData;


    // add any passed in ?terms=term%20one,term2

    $namedSearch = array();
    $originalNamedSearch = array();

    $customterms = $urlHandler->getParamValue("terms");
    $customTermsArray = explode(",", $customterms);
    foreach ($customTermsArray as $customTermItem) {
        if(strlen(trim($customTermItem))>0){
            $namedSearch[trim(urldecode($customTermItem))] = trim($customTermItem);
            $originalNamedSearch[trim(urldecode($customTermItem))]=trim(urldecode($customTermItem));
        }
    }

    ksort($namedSearch);

    $jsonSavedSearchesData = array();
    foreach ($namedSearch as $key => $value) {
        $jsonDataToAdd = array();
        $jsonDataToAdd = array("encodedTerm"=>$value, "visibleTerm"=>$key, "namedSearch" => $originalNamedSearch[$key], "urlParams"=>$urlParams);
        array_Push($jsonSavedSearchesData, $jsonDataToAdd);
    }

    $jsonSavedSearches["adhoc"] = $jsonSavedSearchesData;

    echo "<script>const searchData = ".json_encode($jsonSavedSearches).";</script>";
    echo "<div id='favouritesGUI'></div>";


}catch(Exception $e){
    echo "<!-- ".$e." -->";
}

?>


<p>NOTE: you can pass in a list of terms as URL param (url encoded and comma separated): ?terms=first%20term,anotherterm</p>

<hr/>

<p>Favourites are stored locally in your browser local storage. If you use a different browser to access ChatterScan then you will not see your favourites listed here and will have to recreate them.</p>


<h2>Local Favourite Searches</h2>

<p><button onclick="addSearchTerm()">Add Search Term</button></p>

<div>
    <ul id="searchtermslist">

    </ul>
</div>

<script>

    var localStorageSearchTermKey = "chatterscan.searchterms."+username;

    var searchterms = [];

    function addToList(promptText, theArray){
        var theValue = prompt(promptText);
        theArray.push(theValue);
        return theValue;
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

    function loadSearchTermsFromStorage(){
        loadArrayFromLocal(localStorageSearchTermKey, searchterms);
    }

    function clearULwithId(anId){
        var ul = document.getElementById(anId);
        while( ul.firstChild ){
            ul.removeChild( ul.firstChild );
        }
    }

    function clearSearchTermsList(){
        clearULwithId("searchtermslist");
    }

    function deleteSearchTerm(arrayindex){
        searchterms.splice(arrayindex, 1);
        storeSearchTerms();
        clearSearchTermsList();
        renderSearchTerms();
        addTermsToSearchData( searchterms, 'local-search-terms');
        populateSearchTermGui(document.querySelector(".search-terms-section"));
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
        <button onclick="${deleteFunctionName}(${arrayindex})">Delete</button> ${term}
`;


        var li = document.createElement("li");
        li.innerHTML = thePostLiWithDeleteButton;

        ul.appendChild(li);

    }

    function addSearchTermToList(searchTerm, arrayindex){
        addFaveToList("searchtermslist", "deleteSearchTerm", "searchterm", searchTerm, arrayindex);
        addTermsToSearchData( searchterms, 'local-search-terms');
        populateSearchTermGui(document.querySelector(".search-terms-section"));
    }

    function addTermsToSearchData(arrayOfTerms, searchDataName){

        delete searchData[searchDataName];

        var numberOfTerms = arrayOfTerms.length;
        if(numberOfTerms==0){
            return;
        }
        const terms = [];
        for (var i = 0; i < numberOfTerms; i++) {

            terms.push(
                {
                    encodedTerm: encodeURIComponent(arrayOfTerms[i]),
                    namedSearch: arrayOfTerms[i],
                    urlParams: searchData.twitter[0].urlParams,
                    visibleTerm: arrayOfTerms[i]
                }
            )
        }
        searchData[searchDataName]=terms;
    }

    function renderSearchTerms(){
        var numberOfSearchTerms = searchterms.length;
        for (var i = 0; i < numberOfSearchTerms; i++) {
            addSearchTermToList(searchterms[i], i);
        }
    }


    loadSearchTermsFromStorage();
    renderSearchTerms();
    addTermsToSearchData( searchterms, 'local-search-terms')


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
