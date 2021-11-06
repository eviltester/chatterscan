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
    <ul class="favourite-searches-list>
     <li><button>name</button></li>
     ... etc.
    </ul>

    onClick for the button would be hooked to an event
    add the data params as data- params on the element e.g data-hashtag data-url-params etc.
 */

function createSearchTermGUI(parentElement){

    const searchTermsSection = document.createElement("div");
    searchTermsSection.setAttribute("class", "search-terms-section");

    for(var searchTermDataCategory in searchData){

        const searchTermsHeader = document.createElement("p");
        searchTermsHeader.innerText = searchTermDataCategory;
        searchTermsSection.appendChild(searchTermsHeader);

        const searchTermsList = document.createElement("ul");
        searchTermsList.setAttribute("class", "favourite-searches-list");
        searchTermsSection.appendChild(searchTermsList);

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

    parentElement.appendChild(searchTermsSection);
}

function populateLaunchPadForData(event){
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

function getTextUrlObject(text, url){
    return {"text" : text, "url":url};
}
function populateSearchTermLaunchPad(launchPadElement, searchTermData){

    // clean the launch pad
    while (launchPadElement.firstChild) {
        launchPadElement.firstChild.remove()
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

    // create all the links for the sections for the search term data
    const chatterScanUrls = [];
    chatterScanUrls.push(
        getTextUrlObject("chatterscan", `mainview.php${urlParams}&searchterm=${encodedTerm}`)
    )
    chatterScanUrls.push(
        getTextUrlObject("#chatterscan", `mainview.php${urlParams}&hashtag=${hashTagTerm}`)
    )

    const searchTermUrls = [];
    searchTermUrls.push(getTextUrlObject(
            "Twitter", `https://twitter.com/search?q=${encodedTerm}&src=typed_query`)
    )
    searchTermUrls.push(getTextUrlObject(
        "Twitter Likes", `https://twitter.com/search?q=${encodedTerm}%20min_faves%3A10%20filter%3Alinks&f=live&src=typed_query`)
    )
    searchTermUrls.push(getTextUrlObject(
        "Twitter Shares", `https://twitter.com/search?q=${encodedTerm}%20min_retweets%3A10%20filter%3Alinks&f=live&src=typed_query`)
    )
    searchTermUrls.push(getTextUrlObject(
        "LinkedIn", `https://www.linkedin.com/search/results/content/?keywords=${encodedTerm}&origin=FACETED_SEARCH&sortBy=%22date_posted%22`)
    )
    searchTermUrls.push(getTextUrlObject(
        "FaceBook", `https://www.facebook.com/search/top/?q=${encodedTerm}`)
    )
    searchTermUrls.push(getTextUrlObject(
        "news.Google", `https://news.google.com/search?q=${encodedTerm}`)
    )
    searchTermUrls.push(getTextUrlObject(
        "Google nws", `https://www.google.com/search?q=${encodedTerm}&tbs=sbd:1,qdr:w&tbm=nws&source=lnt`)
    )
    searchTermUrls.push(getTextUrlObject(
        "Google week", `https://www.google.com/search?q=${encodedTerm}&source=lnt&tbs=qdr:w`)
    )
    searchTermUrls.push(getTextUrlObject(
        "YouTube", `https://www.youtube.com/results?search_query=${encodedTerm}&sp=CAI%253D`)
    )
    searchTermUrls.push(getTextUrlObject(
        "Reddit", `https://www.reddit.com/search/?q=${encodedTerm}&sort=new`)
    )
    searchTermUrls.push(getTextUrlObject(
        "HackerNoon", `https://hackernoon.com/search?query=${encodedTerm}`)
    )
    searchTermUrls.push(getTextUrlObject(
        "HackerNews", `https://hn.algolia.com/?dateRange=all&page=0&prefix=false&query=${encodedTerm}&sort=byDate&type=story`)
    )

    const hashTagUrls = [];
    hashTagUrls.push(getTextUrlObject(
        "#Twitter", `https://twitter.com/search?q=%23${hashTagTerm}`)
    )
    hashTagUrls.push(getTextUrlObject(
        "#Twitter Likes", `https://twitter.com/search?q=%23${hashTagTerm}%20min_faves%3A10%20filter%3Alinks&f=live`)
    )
    hashTagUrls.push(getTextUrlObject(
        "#Twitter Shares", `https://twitter.com/search?q=%23${hashTagTerm}%20min_retweets%3A10%20filter%3Alinks&f=live`)
    )
    hashTagUrls.push(getTextUrlObject(
        "#Linkedin", `https://www.linkedin.com/feed/hashtag/${hashTagTerm}`)
    )
    hashTagUrls.push(getTextUrlObject(
        "#Instagram", `https://www.instagram.com/explore/tags/${hashTagTerm}`)
    )
    hashTagUrls.push(getTextUrlObject(
        "#news.Google", `https://news.google.com/search?q=${hashTagTerm}`)
    )
    hashTagUrls.push(getTextUrlObject(
        "#YouTube", `https://www.youtube.com/results?search_query=%23${hashTagTerm}&sp=CAI%253D`)
    )
    hashTagUrls.push(getTextUrlObject(
        "#Reddit", `https://www.reddit.com/search/?q=${hashTagTerm}&sort=new`)
    )
    hashTagUrls.push(getTextUrlObject(
        "#HackerNoon", `https://hackernoon.com/search?query=${hashTagTerm}`)
    )
    hashTagUrls.push(getTextUrlObject(
        "#HackerNews", `https://hn.algolia.com/?dateRange=all&page=0&prefix=false&query=${hashTagTerm}&sort=byDate&type=story`)
    )
    hashTagUrls.push(getTextUrlObject(
        "#StackOverflow", `https://stackoverflow.com/questions/tagged/${hashTagTerm}?sort=Newest&filters=NoAcceptedAnswer&edited=true`)
    )

    addSectionToLaunchPad("Chatterscan - " + visibleTerm, chatterScanUrls, launchPadElement);
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

    const ul = document.createElement("ul");
    for(var aLink of urlsToAddAsSectionItems){
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.innerText=aLink.text;
        a.setAttribute("href",aLink.url);
        a.setAttribute("target","_blank");

        li.appendChild(a);
        ul.appendChild(li);

    }
    parentElement.appendChild(ul);

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
        console.log(elems[i].getAttribute("href"));
        setTimeout((e)=>e.click()
            ,timeout,elems[i]);
        timeout = timeout+timeoutinc;
    }
}

window.onload = function() {
    createSearchTermGUI(document.getElementById("favouritesGUI"));
    createSearchTermLaunchPad(document.getElementById("favouritesGUI"));
    populateSearchTermLaunchPad(document.getElementById("search-terms-launchpad"), searchData['twitter'][0])
};