/*
    `searchData` is an array containing the objects to render as search values

e.g.

encodedTerm: "general+semantics"
namedSearch: "general semantics"
urlParams: "?"
visibleTerm: "general semantics"


    `favouritesGUI` is the id of the div to use as the placeholder for the GUI
 */

// a list of search terms
// might need to be a scrollable list
/*
    <ul class="favourite-searches-list><script src="favourites-new.js"></script>
     <li><button>name</button></li>
     ... etc.
    </ul>

    onClick for the button would be hooked to an event
    add the data params as data- params on the element e.g data-hashtag data-url-params etc.
 */

function clearSearchTermGui(elem){
    if(elem===undefined)
        return;
    if(elem===null)
        return;
    while (elem.firstChild) {
        elem.firstChild.remove()
    }
}

function asTextName(aName){

    // capitalize first letter
    var retName = aName[0].toUpperCase() + aName.substring(1);
    // remove any - and _
    retName = retName.replaceAll("-"," ").replaceAll("_", " ");
    return retName;
}


function populateSearchTermGui(elem){

    if(elem===null)
        return;

    if(elem===undefined)
        return;

    clearSearchTermGui(elem)

    for(var searchTermDataCategory in searchData){

        if(searchData[searchTermDataCategory].length==0){
            continue;
        }

        const searchTermsHeader = document.createElement("p");
        searchTermsHeader.innerText = asTextName(searchTermDataCategory);
        elem.appendChild(searchTermsHeader);

        const searchTermsList = document.createElement("ul");
        searchTermsList.setAttribute("class", "favourite-searches-list");
        elem.appendChild(searchTermsList);

        // for each search term add the button

        for( searchTermData of searchData[searchTermDataCategory]){

            const li = document.createElement("li");
            const button = document.createElement("button");
            button.innerText = searchTermData.visibleTerm;

            button.setAttribute("data-encodedTerm", searchTermData.encodedTerm);
            button.setAttribute("data-namedSearch", searchTermData.namedSearch);
            button.setAttribute("data-urlParams", searchTermData.urlParams);
            button.setAttribute("data-visibleTerm", searchTermData.visibleTerm);

            button.addEventListener('click', populateLaunchPadForData);
            li.appendChild(button);
            searchTermsList.appendChild(li);

        }
    }

}

function createSearchTermGUI(parentElement){

    const searchTermsSection = document.createElement("div");
    searchTermsSection.setAttribute("class", "search-terms-section");

    parentElement.appendChild(searchTermsSection);

    populateSearchTermGui(searchTermsSection);
}

function populateLaunchPadForData(event){

    document.querySelectorAll(".favourite-searches-list li button").forEach(elem => elem.classList.remove("selected"));
    event.target.classList.add("selected");
    populateSearchTermLaunchPad(
        document.getElementById("search-terms-launchpad"),
        {
            encodedTerm: event.target.getAttribute("data-encodedTerm"),
            namedSearch: event.target.getAttribute("data-namedSearch"),
            urlParams: event.target.getAttribute("data-urlParams"),
            visibleTerm: event.target.getAttribute("data-visibleTerm")
        })
}

/*
    The panel that has all the search term buttons for chatterscan, twitter, facebook etc.

    Initialise unpopulated.
 */
function createSearchTermLaunchPad(parentElement){
    const searchTermsLaunchpad = document.createElement("div");
    searchTermsLaunchpad.setAttribute("class", "search-terms-launchpad");
    searchTermsLaunchpad.setAttribute("id", "search-terms-launchpad");
    parentElement.appendChild(searchTermsLaunchpad);
}

function getTextUrlObject(text, url, description, parentTerm){
    return {"text" : text, "url":url, "description": description, "parentterm": parentTerm};
}

function clearSearchTermLaunchPad(){
    const launchpad = document.querySelector("div.search-terms-launchpad");
    if(!launchpad){
        return;
    }

    // clean the launch pad
    while (launchpad.firstChild) {
        launchpad.firstChild.remove()
    }
}
function populateSearchTermLaunchPad(launchPadElement, searchTermData){

    // clean the launch pad
    while (launchPadElement.firstChild) {
        launchPadElement.firstChild.remove()
    }

    if(searchTermData==undefined){
        return;
    }

    // get the replacement data ready
    const encodedTerm = searchTermData.encodedTerm;
    const visibleTerm = searchTermData.visibleTerm;
    const namedSearch = searchTermData.namedSearch;
    const urlParams = searchTermData.urlParams;

    var searchType = "searchterm";
    if(encodedTerm.startsWith("#") || encodedTerm.startsWith("%23")){
        searchType = "hashtag";
    }

    var hashTagTerm=encodedTerm;
    var showTag = false;
    if(encodedTerm.startsWith("#")){
        hashTagTerm = encodedTerm.substring(1);
        showTag=true;
    }
    if(encodedTerm.startsWith("%23")){
        hashTagTerm = encodedTerm.substring(3).toLowerCase();
        showTag=true;
    }
    if(!showTag){
        // it isn't a hashtag so create a version that is
        hashTagTerm = visibleTerm.replace(/ /g, "");
        $showTag=true;
    }

    //quick hack fix if no url params
    // todo: use URLSearchParams to manage params
    let searchTermPrefix = "&";
    if(urlParams==null || urlParams.length===0){
        searchTermPrefix="?";
    }

    // create all the links for the sections for the search term data
    const chatterScanUrls = [];
    chatterScanUrls.push(
        getTextUrlObject("chatterscan", `mainview.php${urlParams}${searchTermPrefix}searchterm=${encodedTerm}`,
            `View the search term "${visibleTerm}" in Chatterscan`, visibleTerm)
    )
    chatterScanUrls.push(
        getTextUrlObject("#chatterscan", `mainview.php${urlParams}${searchTermPrefix}hashtag=${hashTagTerm}`,
            `View the HashTag term "${hashTagTerm}" in Chatterscan`, visibleTerm)
    )

    const searchTermUrls = [];
    searchTermUrls.push(getTextUrlObject(
            "Twitter", `https://twitter.com/search?q=${encodedTerm}&src=typed_query%20filter%3Alinks&f=live`,
        `Search Twitter for recent mentions of "${visibleTerm}"`, visibleTerm)
    )
    searchTermUrls.push(getTextUrlObject(
        "Twitter Likes", `https://twitter.com/search?q=${encodedTerm}%20min_faves%3A10%20filter%3Alinks&f=live&src=typed_query`,
        `Show Twitter for recent mentions of "${visibleTerm}" which have most likes`, visibleTerm)
    )
    searchTermUrls.push(getTextUrlObject(
        "Twitter Shares", `https://twitter.com/search?q=${encodedTerm}%20min_retweets%3A10%20filter%3Alinks&f=live&src=typed_query`,
        `Show Twitter for recent mentions of "${visibleTerm}" which have most retweets`, visibleTerm)
    )
    searchTermUrls.push(getTextUrlObject(
        "LinkedIn", `https://www.linkedin.com/search/results/content/?keywords=${encodedTerm}&origin=FACETED_SEARCH&sortBy=%22date_posted%22`,
        `Show LinkedIn search for recent mentions of "${visibleTerm}"`, visibleTerm)
    )

    searchTermUrls.push(getTextUrlObject(
        "news.Google", `https://news.google.com/search?q=${encodedTerm}`,
        `Show news.google search for "${visibleTerm}"`, visibleTerm)
    )
    searchTermUrls.push(getTextUrlObject(
        "Google nws", `https://www.google.com/search?q=${encodedTerm}&tbs=sbd:1,qdr:w&tbm=nws&source=lnt`,
        `Show google search for recent news about "${visibleTerm}"`, visibleTerm)
    )
    searchTermUrls.push(getTextUrlObject(
        "Google week", `https://www.google.com/search?q=${encodedTerm}&source=lnt&tbs=qdr:w`,
        `Show google search for recent mentions of "${visibleTerm}"`, visibleTerm)
    )

    searchTermUrls.push(getTextUrlObject(
        "Google Search", `https://www.google.com/search?q=${encodedTerm}&source=lnt&tbs=qdr:w`,
        `Search Google for recent posts about "${visibleTerm}"`, visibleTerm)
    )
    searchTermUrls.push(getTextUrlObject(
        "Google Blog Search", `https://www.google.com/search?q="${encodedTerm}"+blog+-blog.ag-grid.com&source=lnt&tbs=qdr:w`,
        `Search Google for blog posts about "${visibleTerm}"`, visibleTerm)
    )
    searchTermUrls.push(getTextUrlObject(
        "Google Video Search", `https://www.google.com/search?q=${encodedTerm}&tbm=vid&source=lnt&tbs=qdr:w`,
        `Search Google for recent videos about "${visibleTerm}"`, visibleTerm)
    )

    searchTermUrls.push(getTextUrlObject(
        "YouTube", `https://www.youtube.com/results?search_query=${encodedTerm}&sp=CAI%253D`,
        `Search YouTube for recent videos about "${visibleTerm}"`, visibleTerm)
    )
    searchTermUrls.push(getTextUrlObject(
        "Reddit", `https://www.reddit.com/search/?q=${encodedTerm}&sort=new`,
        `Search Reddit for recent posts about "${visibleTerm}"`, visibleTerm)
    )
    searchTermUrls.push(getTextUrlObject(
        "HackerNoon", `https://hackernoon.com/search?query=${encodedTerm}`,
        `Search HackerNoon for recent posts about "${visibleTerm}"`, visibleTerm)
    )
    searchTermUrls.push(getTextUrlObject(
        "HackerNews", `https://hn.algolia.com/?dateRange=all&page=0&prefix=false&query=${encodedTerm}&sort=byDate&type=story`,
        `Search HackerNews for recent posts about "${visibleTerm}"`, visibleTerm)
    )
    searchTermUrls.push(getTextUrlObject(
        "StackOverflow", `https://stackoverflow.com/search?tab=newest&q=${encodedTerm}`,
        `Search StackOverflow for recent posts about "${visibleTerm}"`, visibleTerm)
    )

    searchTermUrls.push(getTextUrlObject(
        "Dev.to", `https://dev.to/search?q=${encodedTerm}&sort_by=published_at&sort_direction=desc`,
        `Search Dev.to for recent posts about "${visibleTerm}"`, visibleTerm)
    )
    searchTermUrls.push(getTextUrlObject(
        "Medium", `https://medium.com/search?q=${encodedTerm}`,
        `Search Medium for posts about "${visibleTerm}"`, visibleTerm)
    )

    searchTermUrls.push(getTextUrlObject(
        "Quora Search", `https://www.quora.com/search?q=${encodedTerm}&time=week`,
        `Search Quora for recent posts about "${visibleTerm}"`)
    )

    searchTermUrls.push(getTextUrlObject(
        "Facebook Posts", `https://www.facebook.com/search/posts/?q=${encodedTerm}`,
        `Search Facebook for posts about "${visibleTerm}"`)
    )

    searchTermUrls.push(getTextUrlObject(
        "Facebook", `https://www.facebook.com/search/?q=${encodedTerm}`,
        `Search All Facebook for posts about "${visibleTerm}"`)
    )

    searchTermUrls.push(getTextUrlObject(
        "Bing News", `https://www.bing.com/news/search?q=${encodedTerm}&qft=sortbydate%3d%221%22+interval%3d%227%22`,
        `Bing news last 24 hours for "${visibleTerm}"`)
    )

    searchTermUrls.push(getTextUrlObject(
        "InfoQ", `https://www.infoq.com/search.action?queryString=${encodedTerm}&page=1&searchOrder=date`,
        `Search InfoQ for recent "${visibleTerm}"`)
    )

    searchTermUrls.push(getTextUrlObject(
        "FreeCodeCamp", `https://www.freecodecamp.org/news/search/?query=${encodedTerm}`,
        `FreeCodeCamp news search for "${visibleTerm}"`)
    )

    const hashTagUrls = [];
    hashTagUrls.push(getTextUrlObject(
        "#Twitter", `https://twitter.com/search?q=%23${hashTagTerm}%20filter%3Alinks&f=live`,
        `Search Twitter for recent posts tagged "${hashTagTerm}"`, visibleTerm)
    )
    hashTagUrls.push(getTextUrlObject(
        "#Twitter Likes", `https://twitter.com/search?q=%23${hashTagTerm}%20min_faves%3A10%20filter%3Alinks&f=live`
        , `Search Twitter for recent posts tagged "${hashTagTerm}" with most likes` , visibleTerm)
    )
    hashTagUrls.push(getTextUrlObject(
        "#Twitter Shares", `https://twitter.com/search?q=%23${hashTagTerm}%20min_retweets%3A10%20filter%3Alinks&f=live`
        , `Search Twitter for recent posts tagged "${hashTagTerm}" with most retweets`, visibleTerm)
    )
    hashTagUrls.push(getTextUrlObject(
        "#Linkedin", `https://www.linkedin.com/feed/hashtag/${hashTagTerm}`
        , `Search LinkedIn for recent posts tagged "${hashTagTerm}"`, visibleTerm)
    )
    hashTagUrls.push(getTextUrlObject(
        "#Instagram", `https://www.instagram.com/explore/tags/${hashTagTerm}`
        , `Search Instagram for recent posts tagged "${hashTagTerm}"`, visibleTerm)
    )
    hashTagUrls.push(getTextUrlObject(
        "#YouTube", `https://www.youtube.com/results?search_query=%23${hashTagTerm}&sp=CAI%253D`
        , `Search YouTube for videos posts tagged "${hashTagTerm}"`, visibleTerm)
    )
    hashTagUrls.push(getTextUrlObject(
        "#Reddit", `https://www.reddit.com/search/?q=${hashTagTerm}&sort=new`
        , `Search Reddit for recent posts tagged "${hashTagTerm}"`, visibleTerm)
    )
    hashTagUrls.push(getTextUrlObject(
        "#HackerNoon", `https://hackernoon.com/search?query=${hashTagTerm}`
        , `Search HackerNoon for recent posts tagged "${hashTagTerm}"`, visibleTerm)
    )
    hashTagUrls.push(getTextUrlObject(
        "#HackerNews", `https://hn.algolia.com/?dateRange=all&page=0&prefix=false&query=${hashTagTerm}&sort=byDate&type=story`
        , `Search HackerNews for recent posts tagged "${hashTagTerm}"`, visibleTerm)
    )
    hashTagUrls.push(getTextUrlObject(
        "#StackOverflow", `https://stackoverflow.com/questions/tagged/${hashTagTerm}?sort=Newest&filters=NoAcceptedAnswer&edited=true`
        , `Search Stackoverflow for recent posts tagged "${hashTagTerm}"`, visibleTerm)
    )
    hashTagUrls.push(getTextUrlObject(
        "#Dev.to", `https://dev.to/t/${hashTagTerm}`
        , `Search Dev.to for posts tagged "${hashTagTerm}"`, visibleTerm)
    )
    hashTagUrls.push(getTextUrlObject(
        "#Facebook", `https://www.facebook.com/hashtag/${hashTagTerm}`
        , `Search Facebook for posts tagged "${hashTagTerm}"`, visibleTerm)
    )

    hashTagUrls.push(getTextUrlObject(
        "#Bing News", `https://www.bing.com/news/search?q=%23${hashTagTerm}&qft=interval%3d%227%22+sortbydate%3d%221%22`
        , `Search Bing news (last 24 hrs) for posts tagged "${hashTagTerm}"`, visibleTerm)
    )




    //addSectionToLaunchPad("Chatterscan - " + visibleTerm, chatterScanUrls, launchPadElement);
    addSectionToLaunchPad("Searches - " + visibleTerm, searchTermUrls, launchPadElement);
    addSectionToLaunchPad("Hash Tags - " + hashTagTerm, hashTagUrls, launchPadElement);

}

function addSectionToLaunchPad(sectionTitle, sectionUrls, parentElement){
    const searchTermLaunchpadSection = document.createElement("div");
    searchTermLaunchpadSection.setAttribute("class", "search-terms-launchpad-section");
    const searchTermLaunchpadHeading = document.createElement("h2");
    searchTermLaunchpadHeading.innerText = sectionTitle;
    searchTermLaunchpadSection.appendChild(searchTermLaunchpadHeading);

    addSearchTermLinksToSection(searchTermLaunchpadSection, sectionUrls);

    parentElement.appendChild(searchTermLaunchpadSection);
}

function addSearchTermLinksToSection(parentElement, urlsToAddAsSectionItems){

    const linkblocks = document.createElement("div");
    linkblocks.classList.add('favourite-link-blocks');
    for(var aLink of urlsToAddAsSectionItems){
        const linkblock = document.createElement("div");
        linkblock.classList.add('favourite-link-block');
        const linkblockHead = document.createElement("div");
        linkblockHead.classList.add('favourite-header');
        const a = document.createElement("a");
        a.innerText=aLink.text;
        a.setAttribute("href",aLink.url);
        a.setAttribute("data-section", aLink.parentterm);
        a.setAttribute("data-name", aLink.text);

        const key = aLink.parentterm + "." + aLink.text;
        const lastDateClicked = lastVisitedSearchTerms[key];
        if(lastDateClicked!=undefined){
            a.setAttribute("data-lastDateClicked", aLink.lastDateClicked);
            a.setAttribute("title", formattedDateFromTimestamp(lastDateClicked))
        }

        a.setAttribute("target","_blank");
        a.addEventListener('click', dateOfLinkClick);

        linkblockHead.appendChild(a)

        linkblock.appendChild(linkblockHead);

        const desc = document.createElement("div");
        desc.classList.add('favourite-link-description');
        const descinner = document.createElement("p");
        descinner.innerText =aLink.description;
        desc.appendChild(descinner);
        linkblock.appendChild(desc)

        if(lastDateClicked!=undefined) {
            const lastDate = document.createElement("p");
            lastDate.classList.add('last-visited-date');
            lastDate.innerText = formattedDateFromTimestamp(lastDateClicked)
            linkblock.appendChild(lastDate)
        }

        linkblocks.appendChild(linkblock);

    }
    parentElement.appendChild(linkblocks);

    const openall = document.createElement("button");
    openall.innerText = "Open All";
    openall.addEventListener('click', ()=>{openAllSectionLinks(parentElement)});

    parentElement.appendChild(openall);
}

function openAllSectionLinks(elem){
    elems = elem.querySelectorAll('a');
    var timeout = 100;
    var timeoutinc=200;
    for (var i = 0; i < elems.length; i++) {
        setTimeout((e)=>e.click()
            ,timeout,elems[i]);
        timeout = timeout+timeoutinc;
    }
}


/*

    Local Storage Access For Local Search Terms

 */

var localStorageSearchTermKey = "chatterscan.searchterms.";

var searchterms = [];

function addToList(promptText, theArray){
    var theValue = prompt(promptText);
    if(theValue) {
        theArray.push(theValue);
    }
    return theValue;
}

function addSearchTerm(){
    var theValue = addToList("Enter Search Term", searchterms)
    if(theValue){
        addSearchTermToList(theValue, searchterms.length-1);
        storeSearchTerms();
    }
}

function storeLastUsedUsername(){
    var usernameKey = "chatterscan.lastusedusername";
    storeArrayLocally(usernameKey,[username]);
}

function loadLastUsedUsername(){
    var usernameKey = "chatterscan.lastusedusername";
    var usernames = []
    loadArrayFromLocal(usernameKey,usernames);
    if(usernames && usernames.length>0){
        username=usernames[0];
    }
}

var usernamesHistory = [];

function addUsernameToHistory(aUsername){
    if(aUsername != ""){
        if(!usernamesHistory.includes(aUsername)){
            usernamesHistory.push(aUsername);
        }
    }
}

function getAllLocallyUsedUsernames(){
    // chatterscan.searchterms.@eviltester   chatterscan.lastVisitSearchTimes.@talotics

    for( x=0;x<localStorage.length;x++){
        const aKey = localStorage.key(x);
        var aUsername = "";
        if(aKey.startsWith("chatterscan.searchterms.")){
            aUsername = aKey.replace("chatterscan.searchterms.", "");
        }
        if(aKey.startsWith("chatterscan.lastVisitSearchTimes.")){
            aUsername = aKey.replace("chatterscan.lastVisitSearchTimes.", "");
        }
        addUsernameToHistory(aUsername);
    }
}


function createTwitterLinksMenu(){
    const twitterLinks = new Map();
    const screen_name = username.replace("@","");

    twitterLinks.set("Feed", "https://twitter.com/home");
    twitterLinks.set("Notifications", "https://twitter.com/i/notifications");
    twitterLinks.set("Messages", "https://twitter.com/messages");
    twitterLinks.set("Topics","https://twitter.com/"+screen_name+"/topics");
    twitterLinks.set("Lists","https://twitter.com/"+screen_name+"/lists");
    twitterLinks.set("Profile","https://twitter.com/"+screen_name);
    twitterLinks.set("Moments","https://twitter.com/"+screen_name+"/moments");

    const elem=document.querySelector("div[data-menuid='twitterlinksmenu']");
    elem.innerHTML = "";

    for (const [key, value] of twitterLinks.entries()) {
        var aelem = document.createElement("a");
        aelem.setAttribute("href", value);
        aelem.setAttribute("target","blank");
        aelem.innerText=key;
        elem.appendChild(aelem);
    }
}


function storeSearchTerms(){
    storeArrayLocally(localStorageSearchTermKey, searchterms);
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

        extraParams = searchData?.twitter[0]?.urlParams ?? [];

        terms.push(
            {
                encodedTerm: encodeURIComponent(arrayOfTerms[i]),
                namedSearch: arrayOfTerms[i],
                urlParams: extraParams,
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




/*
    Local Storage Access for Last Visits

 */

var localStorageLastVisitSearchTimesKey = "chatterscan.lastVisitSearchTimes"
function storeLastVisitSearchTermsToStorage(){
    storeKeyedArrayLocally(localStorageLastVisitSearchTimesKey, lastVisitedSearchTerms);
}

function loadLastVisitSearchTermsFromStorage(){
    loadKeyedArrayFromLocal(localStorageLastVisitSearchTimesKey, lastVisitedSearchTerms);
    // todo: delete any items with keys that do not exist
}

function formattedDateFromTimestamp(timestamp){
    return new Date(timestamp).toLocaleDateString(undefined,{ year: 'numeric', month: '2-digit', day: '2-digit', hour:	'2-digit', minute:	'2-digit', second:	'2-digit' });
}

var lastVisitedSearchTerms = [];

function dateOfLinkClick(event){
    const dateClicked = new Date().valueOf();
    const linkName = event.target.getAttribute("data-name");
    const linkParent = event.target.getAttribute("data-section");
    const key = linkParent +  "." + linkName;
    lastVisitedSearchTerms[key] = dateClicked;
    //console.log({linkName, dateClicked, linkParent})

    event.target.setAttribute("data-lastDateClicked", dateClicked);
    event.target.setAttribute("title", formattedDateFromTimestamp(dateClicked))
    event.target.classList.add('just-visited');

    // if the date exists on screen then change it
    let parent = event.target.parentElement;
    while(!parent.classList.contains("favourite-link-block") && !parent.tagName!="body"){
        parent =parent.parentElement;
    }
    if(parent.classList.contains("favourite-link-block")){
        let visited_date = parent.querySelector("p.last-visited-date");
        if(visited_date!=undefined){
            visited_date.innerHTML = formattedDateFromTimestamp(dateClicked);
        }else{
            const lastDate = document.createElement("p");
            lastDate.classList.add('last-visited-date');
            lastDate.innerText = formattedDateFromTimestamp(dateClicked)
            parent.appendChild(lastDate)
        }
    }


    // save lastVisitedSearchTerms
    storeLastVisitSearchTermsToStorage();
}



function getAdhocSearchTermsFromUrl(){

    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const adhocSearchTermsValues = urlParams.get('terms');
    const adhocSearchTerms = [];

    urlParams.delete('terms');

    if(adhocSearchTermsValues==null){return;}

    if(adhocSearchTermsValues.length!=-0){
        adhocSearchTermsToAdd = adhocSearchTermsValues.split(",");
        adhocSearchTermsToAdd.forEach(term =>{
            const termToAdd = term.trim();
            if(termToAdd.length!=0){
                const adhocSearchTerm = {
                    encodedTerm: termToAdd,
                    visibleTerm: decodeURI(termToAdd),
                    namedSearch: decodeURI(termToAdd),
                    urlParams: urlParams.toString()
                }

                adhocSearchTerms.push(adhocSearchTerm)
            }
        });
    }

    //Sort the adhocSearchTerms array;
    adhocSearchTerms.sort(function(a, b) {
        var nameA = a.visibleTerm.toUpperCase(); // ignore upper and lowercase
        var nameB = b.visibleTerm.toUpperCase(); // ignore upper and lowercase
        if (nameA < nameB) {
            return -1;
        }
        if (nameA > nameB) {
            return 1;
        }

        // names must be equal
        return 0;
    });

    // todo make the AdhocSearchTerms a Set to avoid dupes - important when storing to session storage
    if(searchData["adhoc"]===undefined){
        searchData["adhoc"] = adhocSearchTerms;
    }else{
        searchData["adhoc"].push(...adhocSearchTerms);
    }

}


/*
    Allow manually changing the username to pickup existing local storage items and reinstate the menu items
 */

function changeUser(){

    var name = prompt("Enter Twitter handle");
    if(name){
        var prefix = "@";
        if(!name.startsWith(prefix)){
            name = prefix + name;
        }
        username=name;

        addUsernameToHistory(username);
        changedUser();
    }
}

function changedUser(){
    searchterms = [];

    document.querySelector(".favourite-searches-list li button")?.classList.add("selected");
    displayUserName();
    displayUserNamesHistory();
    clearSearchTermsList();
    loadLocalSearchTermsForUsername();

    const searchTermButtonsParent = document.querySelector(".search-terms-section");
    clearSearchTermGui(searchTermButtonsParent)
    populateSearchTermGui(searchTermButtonsParent);

    clearSearchTermLaunchPad();
    document.querySelector(".favourite-searches-list li button")?.click();
    storeLastUsedUsername();
    createTwitterLinksMenu();
}

function displayUserName(){
    //<p className='loggedin-twitter-details'>
        var elem = document.querySelector("p.loggedin-twitter-details");
        elem.innerHTML=username;
        elem.onclick = changeUser;
}

function displayUserNamesHistory(){
    //<p className='loggedin-twitter-details'>
    var elem = document.querySelector("div.user-details-history");
    elem.innerHTML="";

    var createNew = document.createElement("button");
    createNew.innerText="Add Twitter Handle";
    createNew.onclick = changeUser;

    elem.appendChild(createNew);

    if(usernamesHistory == undefined || usernamesHistory.length==0){
        return;
    }

    var select = document.createElement("select");
    select.setAttribute("name", "chooseusername");
    for(usedUsername of usernamesHistory){
        var option = document.createElement("option");
        option.setAttribute("value", usedUsername);
        if(username && username==usedUsername){
            option.selected = true;
        }
        option.innerText=usedUsername;
        select.appendChild(option);
    }
    elem.appendChild(select);

    select.addEventListener("change", (event) => {
        username = event.target.value;
        changedUser();
    });
}

/*

 */

function loadLocalSearchTermsForUsername(){
    localStorageSearchTermKey = "chatterscan.searchterms."+username;
    localStorageLastVisitSearchTimesKey = "chatterscan.lastVisitSearchTimes."+username;

    getAdhocSearchTermsFromUrl();

    //TODO: create a 'session' terms for any adhoc terms used in the session
    loadSearchTermsFromStorage();
    renderSearchTerms();
    addTermsToSearchData( searchterms, 'local-search-terms')

    // load lastVisitedSearchTerms
    loadLastVisitSearchTermsFromStorage();
}

// todo: add multiple handles
// todo: when multiple handles show drop down of all handles and switch between


window.onload = function() {

    // todo: create a cache for search terms because there is a limit on server side calls on that end point
    // todo: move to XHR for pulling the information in to make it easier to cache and handle errors

    loadLastUsedUsername();
    getAllLocallyUsedUsernames();
    if(username!=undefined && username != "" && !usernamesHistory.includes(username)){
        usernamesHistory.push(username);
    }

    loadLocalSearchTermsForUsername();

    createSearchTermGUI(document.getElementById("favouritesGUI"));
    createSearchTermLaunchPad(document.getElementById("favouritesGUI"));

    let defaultSearchTerm=undefined;
    // if given a search term in url then choose the first
    if(searchData["adhoc"]!==undefined && searchData["adhoc"].length>0){
        defaultSearchTerm=searchData['adhoc'][0];
        const encodedTerm=searchData['adhoc'][0].encodedTerm;
        document.querySelector(`.favourite-searches-list li button[data-encodedterm='${encodedTerm}']`)?.classList.add("selected");
    }
    if(defaultSearchTerm===undefined && searchData['twitter']!==undefined){
        if(searchData["twitter"].length>0){
            defaultSearchTerm=searchData['twitter'][0]
            document.querySelector(".favourite-searches-list li button")?.classList.add("selected");
        }
    }
    if(defaultSearchTerm===undefined && searchData['local-search-terms']!==undefined){
        if(searchData["local-search-terms"].length>0){
            defaultSearchTerm=searchData['local-search-terms'][0]
            document.querySelector(".favourite-searches-list li button")?.classList.add("selected");
        }
    }
    populateSearchTermLaunchPad(document.getElementById("search-terms-launchpad"), defaultSearchTerm);
    createTwitterLinksMenu();

    setTimeout(displayUserName,900);
    setTimeout(displayUserNamesHistory, 1000);
};