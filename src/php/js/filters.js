
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
        paramsAsFilters.hashtag = urlParams.has("hashtag");
    }
    if(urlParams.has("searchterm")){
        paramsAsFilters.search = urlParams.has("searchterm");
    }
    if(urlParams.has("screen_name")){
        paramsAsFilters.screenName = urlParams.has("screen_name");
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
    const filterParams = new URLSearchParams(filters);
    const urlParams = new URLSearchParams(window.location.search);
    // replace any of the urlsearch params with the filters
    for (const [key, value] of filterParams) {
        urlParams.set(key, value);
    }
    // remove search params and refresh
    window.location.href =  window.location.pathname + "?" + urlParams.toString();
}

function hookEventsToFilterElements(){
    document.getElementById("applyFiltersButton").addEventListener("click", applyFiltersFromFiltersMenu);
    document.getElementById("clearSessionDupeTrackingButton").addEventListener("click", clearSessionDupeTracking);
}

function addFiltersMenuToElement(elem){

    if(elem===undefined || elem===null) return;

    // get default filters
    const filters = appliedFilters;

    // get filters from cookies and override defaults
    const storedFilterUrl = new UrlCookieStorage().getFilters();
    const storedFilters = getFiltersFromParams(storedFilterUrl);

    Object.assign(filters, storedFilters);

    // get filters from URL and override stored cookies
    Object.assign(filters, getFiltersFromURL());

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