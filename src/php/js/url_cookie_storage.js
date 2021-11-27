/*
    store the URL for filters - not last read, list, screenname etc.
    as a cookie, and restore from cookie
 */

function UrlCookieStorage(){

    this.addToGUI=function(){
        var filters = document.getElementById("filtersmenu");

        var storeCurrentFilters = document.createElement("button");
        storeCurrentFilters.innerHTML = "Store";

        var restoreSavedFilters = document.createElement("button");
        restoreSavedFilters.setAttribute("id", "restoresavedfilters");
        restoreSavedFilters.innerHTML = "Restore Stored Filters";
        restoreSavedFilters.setAttribute("title", "Restore " + this.getFilters());

        var clearSavedFilters = document.createElement("button");
        clearSavedFilters.innerHTML = "Clear Stored";

        filters.appendChild(storeCurrentFilters);
        filters.appendChild(restoreSavedFilters);
        filters.appendChild(clearSavedFilters);

        storeCurrentFilters.addEventListener ("click", function() {
            var urlstorage = new UrlCookieStorage();
            urlstorage.storeFilters();
            urlstorage.showCurrentRestore();
        });

        restoreSavedFilters.addEventListener ("click", function() {
            var filtersurl = new UrlCookieStorage().getFilters();
            window.location.href =  window.location.pathname + "?" + filtersurl;
        });

        clearSavedFilters.addEventListener ("click", function() {
            var urlstorage = new UrlCookieStorage();
            urlstorage.clearStored();
            urlstorage.showCurrentRestore();
        });
    }

    this.showCurrentRestore= function(){
        var button = document.getElementById("restoresavedfilters");
        if(button!=null){
            button.innerHTML = "Restore Stored Filters";
            button.setAttribute("title", "Restore " + this.getFilters());
        }
    }

    this.clearStored = function(){
        setBase64Cookie("urlfilters", "", -1);
    }

    this.getParamsAsArray = function(){
        var query = window.location.search.substring(1);
        var pairs = query.split('&');
        var params = [];
        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i].split('=');
            params[pair[0]] = pair[1];
        }
        return params;
    }

    function setBase64Cookie(cookieName, cookieValue, expiryDays) {
        var date = new Date();
        date.setTime(date.getTime() + (expiryDays*1000*60*60*24)); // to millis, to seconds, to minutes, to hours, to days
        var expires = "expires="+ date.toUTCString();
        document.cookie = cookieName + "=" + encodeURIComponent(btoa(cookieValue)) + ";" + expires + ";path=/";
    }

    function getBase64CookieValue(cookieName) {
        var name = cookieName + "=";
        var allCookies = document.cookie;
        var cookies = allCookies.split(';');
        for(var i = 0; i <cookies.length; i++) {
            var cookie = cookies[i];
            var keyValue = cookie.split("=");
            if(keyValue[0].trim()==cookieName) {
                return atob(decodeURIComponent(keyValue[1]));
            }
        }
        return "";
    }

    this.getFilters = function(){
        return getBase64CookieValue("urlfilters");
    }

    this.storeFilters = function(){

        var params = this.getParamsAsArray();
        var processThis = true;
        var cookieValue = "";
        var prefix = "";

        for(var key in params) {

            // ignore from_tweet_id etc.
            processThis = true;

            if(key=='from_tweet_id'){
                processThis=false;
            }
            if(key=='screen_name'){
                processThis=false;
            }
            if(key=='list'){
                processThis=false;
            }
            if(key=='list_id'){
                processThis=false;
            }
            if(key=='searchterm'){
                processThis=false;
            }

            if(processThis){
                cookieValue = cookieValue + prefix + key + "=" + encodeURIComponent(params[key]);
                prefix = "&";
            }
        }

        setBase64Cookie("urlfilters", cookieValue, 5);
    }

    this.storeGivenFilters = function(filters){

        var processThis = true;
        var processThisAs = {
            includeReplies : {as : "ignore_replies", negated : true},
            includeRetweets : {as : "include_retweets"},
            showSeenTweets : {as : "hideSeenTweets", negated : true},
            showThreadedReplies : {as : "threaded_replies"},
            includeWithoutLinks : {as : "include_without_links"}
        }
        var cookieValue = "";
        var prefix = "";

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
                cookieValue = cookieValue + prefix + storeAsKeyValue.as + "=" + encodeURIComponent(storeValue);
                prefix = "&";
            }
        }

        setBase64Cookie("urlfilters", cookieValue, 5);
    }
}