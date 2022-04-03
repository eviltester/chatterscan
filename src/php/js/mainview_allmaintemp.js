
// todo: move this to a twitterapi.js file

function getApiCallConfigFromFilters(chatterScanFilters){

    // defaults unless otherwise filtered
    var api_call = "statuses/home_timeline";

    if(chatterScanFilters.showingListId!=""){
        api_call = "lists/statuses";
    }

    if(chatterScanFilters.screenName!=""){
        api_call = "statuses/user_timeline";
    }

    if(chatterScanFilters.hashtag!=""){
        api_call = "search/tweets";
    }

    if(chatterScanFilters.search!=""){
        api_call = "search/tweets";
    }

    const callmapping = {
        "statuses/home_timeline" : "hometimeline",
        "lists/statuses" : "listtimeline",
        "statuses/user_timeline" : "usertimeline",
        "search/tweets" : "search",
    }
    return callmapping[api_call];
}

function getFiltersAsTwitterParams(filters){

    const urlParams = new URLSearchParams();

    var processThisAs = {
        includeReplies : {as : "ignore_replies", negated : true},
        includeRetweets : {as : "include_retweets"},
        showSeenTweets : {as : "hideSeenTweets", negated : true},
        showThreadedReplies : {as : "threaded_replies"},
        includeWithoutLinks : {as : "include_without_links"},
        search : {as : "searchterm"},
        screenName: {as : "screen_name"},
        listOwnerScreenName: {as : "screen_name"},
        hashtag: {as : "hashtag"},
        showingListId : {as : "list_id"},
        showingListName: {as : "list"}
    }

    for(var key in filters) {

        processThis=false;

        if(processThisAs.hasOwnProperty(key)){
            processThis = true;
            storeAsKeyValue = processThisAs[key];
        }

        if(processThis){
            let storeValue = filters[key];
            if(storeAsKeyValue.hasOwnProperty("negated")){
                storeValue = !storeValue;
            }
            if(storeValue!="") {
                urlParams.set(storeAsKeyValue.as, storeValue)
            }
        }
    }

    return urlParams;
}

// currently requires const allTweetData = ${jsonOutputForTesting}; generated in page

const allTweetData = [];


function stopRenderLoading(){
    let loadingIndicator = document.querySelector('#loadingindicator');
    let savebutton = document.querySelector('#savebutton');
    let cancelbutton = document.querySelector('#cancelloadingbutton');


    if(loadingIndicator!=undefined){
        loadingIndicator.style.display = 'none';
    }
    if(cancelbutton!=undefined){
        cancelbutton.style.display = 'none';
    }
    if(savebutton!=undefined){
        savebutton.style.display = 'block';
    }

}

var shouldCancelLoading=false;

function cancelLoading(){
    shouldCancelLoading=true;
}

function renderLoading(progressText){

    // todo create a cancel button

    let loadingIndicator = document.querySelector('#loadingindicator');

    // create it and add to dom if not existing
    if(loadingIndicator==undefined){
        loadingIndicator = document.createElement("div");
        loadingIndicator.setAttribute("id", "loadingindicator");
        loadingIndicator.innerHTML = `
            <img id="loadinggif" src='images/loading-wait.gif'/>
            <p id="loadingtext">Loading Data Please Wait...</p>
        `

        let parent = document.getElementById("show-tweets-start-here");

        savebutton = document.createElement("div");
        savebutton.setAttribute("id", "savebutton");
        savebutton.innerHTML = `
            <button onclick="saveTweetDataToFile()">Save Data</button>
        `;
        savebutton.style.display = 'none';

        cancelbutton = document.createElement("div");
        cancelbutton.setAttribute("id", "cancelloadingbutton");
        cancelbutton.innerHTML = `
            <button onclick="cancelLoading()">Cancel Loading</button>
        `;
        cancelbutton.style.display = 'block';

        if(parent){
            parent.appendChild(cancelbutton);
            parent.appendChild(savebutton);
            parent.appendChild(loadingIndicator);
        }
    }

    loadingIndicator.style.display = 'block';

    // update loading indicator here
    document.getElementById("loadingtext").innerText = progressText;
}

function showTweetsSummaryList(tweetsArray){

    const parent = document.getElementById("show-tweets-start-here");
    const ul = document.createElement("ul");
    tweetsArray.forEach((tweet) =>{
        const li = document.createElement("li");
        href = 'https://twitter.com/' + tweet.user.screen_name + '/status/' + tweet.id_str;
        text = tweet.full_text;
        tweetLinkText = tweet.created_at;
        li.innerHTML = `
            <a href='${href}' target="'_blank'">[${tweetLinkText}]</a> ${text}
        `;
        ul.appendChild(li);
    })
    parent.appendChild(ul);
}

function showError(errorText){
    const parent = document.getElementById("show-tweets-start-here");
    const errorp = document.createElement("p");
    errorp.innerHTML="Error: " + errorText;
    parent.appendChild(errorp)
}

function getTweetDataContentTracker(){

    var outputJson = []

    for(var tweetcount = 0; tweetcount < allTweetData.length; tweetcount++){

        var tweet = allTweetData[tweetcount];
        if(tweet.urls) {
            if (tweet.urls[0]) {
                if (tweet.urls[0]["urlHref"]) {
                    var outputTweet = {};
                    outputTweet.text = tweet.display_portion;
                    outputTweet.user = tweet.screenName;
                    outputTweet.date = tweet.created_at;
                    outputTweet.id = tweet.id;
                    outputTweet.urls = tweet.urls.map(x => x["urlHref"])
                    outputJson.push(outputTweet);
                }
            }
        }
        if(tweet?.entities?.urls) { // handle raw twitter data
            if (tweet.entities.urls[0]) {
                if (tweet.entities.urls[0].url!=undefined) {
                    var outputTweet = {};
                    outputTweet.text = tweet.full_text;
                    outputTweet.user = tweet.user.screen_name;
                    outputTweet.date = tweet.created_at;
                    outputTweet.id = tweet.id_str;
                    outputTweet.urls = tweet.entities.urls.map(x => x["url"])
                    outputTweet.urls.push(...tweet.entities.urls.map(x => x["expanded_url"]))
                    outputJson.push(outputTweet);
                }
            }
        }
    }

    return JSON.stringify(outputJson,null,4);
}

// added as variable to make it easy to overwrite for adhoc exports
var getTweetDataAsString = getTweetDataContentTracker;

// https://gist.github.com/philipstanislaus/c7de1f43b52531001412
function saveBlob (blob, fileName){
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    var url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a)
}

function saveTweetDataToFile() {
    var blob = new Blob([getTweetDataAsString()],
        { type: "text/plain;charset=utf-8" });
    filename = "export" + new Date().getTime() + ".json";
    saveBlob(blob, filename);
}

window.addEventListener('load', (event) => {


    // add next page button at top as well
    const givenNextPageButton = document.querySelector('div.nextpage');
    if(givenNextPageButton!=undefined) {
        const newNextPageButton = givenNextPageButton.cloneNode(true);
        const nextPageButtonParent = document.querySelector('#next-button-placemarker');
        nextPageButtonParent.appendChild(newNextPageButton);
    }


    addFiltersMenuToElement(document.getElementById('filterscontrol'));
    hookEventsToFilterElements()


    addEditSearchTermButton();

    var localMutedAccountsKey = `chatterscan.localmutedaccounts.${twitterUserHandle}`;
    var mutedAccountsStorage = new MutedAccountsStorage(localMutedAccountsKey);
    var serverMutedAccountsKey = `chatterscan.serverMutedAccountIds.${twitterUserHandle}`;
    var mutedAccountIdsStorage = new MutedAccountsStorage(serverMutedAccountsKey);
// todo this should be a manual refresh action in the plugins
//echo "mutedAccountsGUI.getMutedIdsFromServer();";
    var mutedAccountsGUI = new MutedAccountsGUI(mutedAccountsStorage, mutedAccountIdsStorage);
    mutedAccountsGUI.addMutedPluginSection();
    mutedAccountsGUI.deleteTweetsFromMutedAccounts();
    mutedAccountsGUI.deleteTweetsFromMutedAccountIds();
    mutedAccountsGUI.addMuteButtonsToTweets();


    // process existing data added by php
    // make the decision about which to who, as this is now done by JavaScript
    // in tweet_decider static function
    const currentFilters = getCurrentFilters()
    var decisionStats = decideStatusOfArrayOfTweets(currentFilters,allTweetData);
    renderCollectionOfTweetsInDOM(allTweetData);

    // todo: change the urlStorage to track based the allTweetData array rather than the DOM, it will be faster
    // todo: duplicates is not just based on href it is based on the filters, and is after rendering tweets
    // if(!appliedFilters.showSeenTweets){ // location.href.includes("hideSeenTweets=true")) {
    //     var urlStorage = new UrlStorage();
    //     urlStorage.trackDuplicatedLinks();
    //     urlStorage.trackDuplicatedTweets();
    // }


    function loadData(currentTweetCount, previousFirstId, continueAtId, totalFoundInLastCall){

        renderLoading(`Loading Please Wait... total found: ${currentTweetCount}`);

        const apicallname = getApiCallConfigFromFilters(currentFilters);
        // experiment with dynamic loading of next set - it basically works
        const searchParams = getFiltersAsTwitterParams(currentFilters);
        if (continueAtId > 0) {
            searchParams.set("from_tweet_id", continueAtId)
        }
        // remove from_tweet_id if 0 and start from beginning
        if (searchParams.has("from_tweet_id")) {
            if (searchParams.get("from_tweet_id") == "0") {
                searchParams.delete("from_tweet_id")
            }
        }
        console.log(searchParams.toString());
        // get the filters and pass them through to the api as params
        var apicall = 'twitterapi.php?apicall=' + apicallname;
        apicall = apicall + "&" + searchParams.toString();

        fetch(apicall)
            .then(response => {
                console.log(response);
                return response.json()
            })
            .then(data =>{
                console.log(data);

                if(data.search_metadata != undefined){
                    data = data.statuses;
                }
                // assume nothing more to do
                var continueLoading=false;

                if(data==undefined || data==null){
                    // we are finished
                }else{

                    if(data.error){
                        showError(data.error);
                    }

                    // if we found data
                    if(data.length>0){
                        // and it was new data
                        var decisionStats = decideStatusOfArrayOfTweets(currentFilters,data);
                        var addNewData = true;

                        // nothing found
                        if(decisionStats.number_processed==0){
                            addNewData=false;
                        }

                        // we only found what we wanted to continue at
                        if(decisionStats.max_id == continueAtId){
                            addNewData = false;
                        }

                        // remove the previous max_id
                        if(data[0].id == continueAtId){
                            data.shift()
                        }

                        // add all the data to the allTweetData array
                        if(addNewData){
                            allTweetData.push(...data);
                            continueLoading=true;
                        }
                    }
                }

                if(shouldCancelLoading){
                    continueLoading = false;
                }

                if(!continueLoading){
                    stopRenderLoading();
                    // display items on screen
                    showTweetsSummaryList(allTweetData);
                }else{
                    loadData(   allTweetData.length,
                                decisionStats.first_id,
                                decisionStats.max_id,
                                decisionStats.number_processed
                    );
                }
            } );

        // add data to the allTweetsData
        // get more
        // end when finished
    }

    shouldCancelLoading=false;
    loadData(   allTweetData.length,
                decisionStats.first_id,
                decisionStats.max_id,
                decisionStats.number_processed
    );


});