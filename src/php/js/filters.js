
const appliedFilters = {

    includeReplies : false,
    includeRetweets: true,
    showSeenTweets: false,
    showThreadedReplies : true,
    includeWithoutLinks: false,
    nextUrl: "mainview.php",

    // todo: these are in the params but should not be in filters
    fromTweetId: "",
    showingListId: "",
    showingListName : "",
    hashtag: "",
    search: "",
    listOwnerScreenName: "",
    screenName : ""

}

function getFiltersFromURL(){

    return getFiltersFromParams(window.location.search);

}

function getFiltersFromParams(params){

    const urlParams = new URLSearchParams(params);

    const paramsAsFilters = {};

    if(urlParams.has("from_tweet_id")){
        paramsAsFilters.fromTweetId = urlParams.get("from_tweet_id");
    }
    if(urlParams.has("ignore_replies")){
        paramsAsFilters.includeReplies = getNegatedBooleanParam("ignore_replies", urlParams);
    }
    if(urlParams.has("hideSeenTweets")){
        paramsAsFilters.showSeenTweets = getNegatedBooleanParam("hideSeenTweets", urlParams);
    }
    if(urlParams.has("threaded_replies")){
        paramsAsFilters.showThreadedReplies = getBooleanParam("threaded_replies", urlParams);
    }
    if(urlParams.has("include_retweets")){
        paramsAsFilters.includeRetweets = getBooleanParam("include_retweets", urlParams);
    }
    if(urlParams.has("include_without_links")){
        paramsAsFilters.includeWithoutLinks = getBooleanParam("include_without_links", urlParams);
    }

    if(urlParams.has("list")){
        paramsAsFilters.showingListName = urlParams.get("list");
        if(urlParams.has("list_id")){
            paramsAsFilters.showingListId = urlParams.get("list_id");
            if(urlParams.has("owner_screen_name")){
                paramsAsFilters.listOwnerScreenName = urlParams.get("owner_screen_name");
            }
        }
    }

    if(urlParams.has("hashtag")){
        paramsAsFilters.hashtag = urlParams.get("hashtag");
    }
    if(urlParams.has("searchterm")){
        paramsAsFilters.search = urlParams.get("searchterm");
    }
    if(urlParams.has("screen_name")){
        paramsAsFilters.screenName = urlParams.get("screen_name");
    }

    return paramsAsFilters;
}

function getBooleanParam(name, urlParams){
    return urlParams.get(name) === "true" ? true : false
}
function getNegatedBooleanParam(name, urlParams){
    return urlParams.get(name) === "true" ? false : true
}

function generateFiltersMenuHTML(filters){

    const includeReplies = filters.includeReplies === true ? "checked" :  "";
    const includeRetweets = filters.includeRetweets === true ? "checked" :  "";
    const includeWithoutLinks = filters.includeWithoutLinks === true ? "checked" :  "";
    const showSeenTweets = filters.showSeenTweets === true ? "checked" :  "";
    const showThreadedReplies = filters.showThreadedReplies === true ? "checked" :  "";

    const mainHtml = `
<div id='filterscontrolarea' class="filters-control-area">
        <div class="filter-options">
            <p>Filters:</p>
            <div id='filteroptions'>
                <ul class="filter-checkbox-options">  
                <li>         
                    <input type="checkbox" id="includeWithoutLinks" name="includeWithoutLinks">
                        <label for="includeWithoutLinks">Show Posts Without Links</label>
                </li>
                <li> 
                    <input type="checkbox" id="includeRetweets" name="includeRetweets">
                        <label for="includeRetweets">Show Retweets</label>
                </li>
                <li>                        
                    <input type="checkbox" id="includeReplies" name="includeReplies">
                        <label for="includeReplies">Show Replies</label>
                </li>
                <li>                         
                    <input type="checkbox" id="showSeenTweets" name="showSeenTweets">
                        <label for="showSeenTweets">Show Seen Tweets</label>
                </li>
                <li>
                    <input type="checkbox" id="showThreadedReplies" name="showThreadedReplies">
                        <label for="showThreadedReplies">Show Threaded Replies</label>
                </li>          
                </ul> 
            </div>     
            
            <div class="filter-buttons">
                <button id="applyFiltersButton">Apply Filters</button>
                <button id="clearSessionDupeTrackingButton">Clear Session Dupe Tracking</button>
            </div>
        
        </div>

        <hr/>
</div>
    `;

    return mainHtml;
}

function clearSessionDupeTracking(){
    window.sessionStorage.clear();
}

function checkGuiElementsBasedOnFilters(filters){
    document.getElementById("includeWithoutLinks").checked = filters.includeWithoutLinks;
    document.getElementById("includeRetweets").checked = filters.includeRetweets;
    document.getElementById("includeReplies").checked = filters.includeReplies;
    document.getElementById("showSeenTweets").checked = filters.showSeenTweets;
    document.getElementById("showThreadedReplies").checked = filters.showThreadedReplies;
}

function applyFiltersFromFiltersMenu(){
    // set the filter values from the checkboxes

    appliedFilters.includeWithoutLinks = document.getElementById("includeWithoutLinks").checked;
    appliedFilters.includeRetweets = document.getElementById("includeRetweets").checked;
    appliedFilters.includeReplies = document.getElementById("includeReplies").checked;
    appliedFilters.showSeenTweets = document.getElementById("showSeenTweets").checked;
    appliedFilters.showThreadedReplies = document.getElementById("showThreadedReplies").checked;

    new UrlCookieStorage().storeGivenFilters(appliedFilters);
    const filters = new UrlCookieStorage().getFilters();

    const newUrl = replaceUrlSearchParamsWithFilters(window.location.href, appliedFilters);
    // remove search params and refresh
    window.location.href =  newUrl;
}

function getFiltersAsUrlSearchParams(filters){

    const urlParams = new URLSearchParams();

    var processThisAs = {
        includeReplies : {as : "ignore_replies", negated : true},
        includeRetweets : {as : "include_retweets"},
        showSeenTweets : {as : "hideSeenTweets", negated : true},
        showThreadedReplies : {as : "threaded_replies"},
        includeWithoutLinks : {as : "include_without_links"}
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
            urlParams.set(storeAsKeyValue.as, storeValue)
        }
    }

    return urlParams;
}

function replaceUrlSearchParamsWithFilters(urlStr, filters){
    let aUrl = "";

    try{
        aUrl = new URL(urlStr);
    }catch{
        //console.log('failed to convert to URL try as relative');
        // handle relative urls
        let joiner="/";
        if(urlStr.startsWith("/")){
            joiner="";
        }
        try {
            aUrl = new URL(window.location.origin + joiner + urlStr);
        }
        catch{
            return;
        }
    }

    const filterParams = getFiltersAsUrlSearchParams(filters);
    const urlParams = new URLSearchParams(aUrl.search);
    // replace any of the urlsearch params with the filters
    for (const [key, value] of filterParams) {
        urlParams.set(key, value);
    }

    //console.log(urlStr);
    //console.log(aUrl.pathname);
    return aUrl.pathname + "?" + urlParams.toString();
}

function hookEventsToFilterElements(){
    document.getElementById("applyFiltersButton").addEventListener("click", applyFiltersFromFiltersMenu);
    document.getElementById("clearSessionDupeTrackingButton").addEventListener("click", clearSessionDupeTracking);
}

function getCurrentFilters(){

    // get default filters
    const filters = appliedFilters;

    // get filters from URL
    Object.assign(filters, getFiltersFromURL());

    // get filters from cookies
    const storedFilterUrl = new UrlCookieStorage().getFilters();
    const storedFilters = getFiltersFromParams(storedFilterUrl);

    Object.assign(filters, storedFilters);

    return filters;
}

function addFiltersMenuToElement(elem){

    if(elem===undefined || elem===null) return;

    // apply filters in order below, each overriding the previous

    filters = getCurrentFilters();


    // use the data-filter-url="true" to HTML elements generated by PHP so that we can find them and amend them

    amendAllServerGeneratedLinksToUseLocalFilterSettings();

    // TODO move the open user code into pure JS from chatterscan_funcs.php on line 193

    const innerHTML = generateFiltersMenuHTML(filters);

    // todo: decorate if the html elements already exist
    const existingMenu = document.getElementById('filterscontrolarea');
    if(existingMenu===null) {
        const div = document.createElement("div");
        div.innerHTML = innerHTML;
        elem.appendChild(div);
    }
    checkGuiElementsBasedOnFilters(filters);
}

function amendAllServerGeneratedLinksToUseLocalFilterSettings(){

    const links = document.querySelectorAll("[data-filter-url='true']");

    // for each link
    links.forEach(elem =>{
        const href = elem.getAttribute('href');
        elem.setAttribute('href', replaceUrlSearchParamsWithFilters(href, appliedFilters))
    })

}