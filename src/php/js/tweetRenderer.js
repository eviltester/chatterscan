class TweetRenderer{

    currentUserHandle="";
    pageNamePHP="mainview.php";
    tweet="";

    tweet_link_url="";

    forUserHandle(aHandle){
        this.currentUserHandle = aHandle;
    }

    mainPage(phpFileName){
        this.pageNamePHP = phpFileName;
    }

    tweetToRender(aTweet){
        this.tweet = aTweet;
        // could cache commonly used HTML or values here
        this.tweet_link_url = this.getTweetLinkURL();
    }

    getHashTagLinkHTML(hashTag){

        const encodedHashTagTerm = encodeURI(hashTag);
        const pageHref = this.pageNamePHP;

        return `
        <a href='${pageHref}?hashtag=${encodedHashTagTerm}' target='_blank'>
            <button>${hashTag}</button>
        </a>
        `

    }

    getHashTagsHTML(){
        const hashtagsArray = this.tweet.hashtags;
        let hashTagHtml = "";

        hashtagsArray.forEach( hashTagTerm => {
            hashTagHtml = hashTagHtml + this.getHashTagLinkHTML(hashTagTerm) + " ";
        })

        return `
        <div class='hashtags'>${hashTagHtml}</div>
        `;
    }

    // occasionally see "this site can't provide secure connection" from twitter with shortened urls
    // thought about adding an expander here
    // unshorten.me has an api https://unshorten.me/api
    // unshorten link has a GET request format https://unshorten.link/check?url=http://goo.gl/B2ZDUr
    // link unshorten has a GET request format https://linkunshorten.com/?url=https%3A%2F%2Fgoo.gl%2FtFM2Ya
    getUrlsHTML(){

        const urlsArray=this.tweet.urls;
        let urlsInnerHTML="";

        const numberOfUrls = urlsArray.length;

        if (numberOfUrls <= 0) {
            return "";
        }

        urlsArray.forEach(aURL => {
            const urlHref = aURL.urlHref;
            const encodedUrlHref = encodeURI(urlHref);
            const urlDisplay = aURL.urlDisplay;

            const urlsli = `
            <li>
                <a href='${urlHref}' target='_blank'>${urlDisplay}</a> expanded:
                <a href='https://unshorten.link/check?url=${encodedUrlHref}'
                   target='_blank'>[unshorten.link]</a>
                <a href='https://linkunshorten.com/?url=$encodedUrlHref'
                   target='_blank'>[linkunshorten.com]</a>
            </li>
            `;
            urlsInnerHTML = urlsInnerHTML + urlsli;
        });

        return `
        <details>
            <summary>urls</summary>
            <div class='urls'>
                <ul>
                    ${urlsInnerHTML}
                </ul>
            </div>
        </details>
        `;

    }

    getTweetLinkURL(){
        const screenName = this.tweet.screenName;
        const tweetId = this.tweet.id;

        return `https://twitter.com/${screenName}/status/${tweetId}`;
    }

    getTweetImageHtml(){
        if(this.tweet.firstImageLink.length > 0){
            const link = this.tweet.firstImageLink;
            return `<img src='${link}' width=150/>"`;
        }else{
            return "";
        }
    }

    getMainTweetLinkHTML(){
        const link = this.tweet_link_url;
        return `<h3 style='text-align: center'><a href='${link}' target='_blank'>view tweet</a></h3>`;
    }

    convertTwitterHandlesIntoLinks(tweetText){

        // twitter handle @[a-zA-Z0-9_]
        let regEx = /@[a-zA-Z0-9_]*/g;

        function convertToScreenNameLink(match, offset, string){
            return this.getScreenNameLink(match.substring(1), match);
        }

        return tweetText.replace(regEx, convertToScreenNameLink.bind(this))
    }

   getTweetContentsHTML(){

        const imageHtml = this.getTweetImageHtml();
        var tweetWithLinks = this.convertTwitterHandlesIntoLinks(this.tweet.full_text);
        const fullText = this.tweet.full_text;
        // for each of the urls replace the urls in the text with a clickable link
       this.tweet.urls.forEach(aUrl =>{
           //urlInPost urlDisplay urlHref
           const findUrl = aUrl.urlInPost;
           const linkUrl = aUrl.urlHref;
           const displayUrl = aUrl.urlDisplay;
           const replaceWith = `<a href='${linkUrl}' target='_blank'>${displayUrl}</a>`;
           tweetWithLinks = tweetWithLinks.replace(findUrl, replaceWith);
       })

        const hrefUrl = this.tweet_link_url;
        let postClass = "textbit";
        if(imageHtml.length>0){
            postClass = "textwithimagebit";
        }

        return `
        <div class='tweetcontents'>
            <div class='${postClass}'>
                <h2 class='tweet-text'>${tweetWithLinks}</h2>
                <!-- ${fullText} -->
            </div>
            <div class='imagebit'>
                <a href='${hrefUrl}' target='_blank'>
                    ${imageHtml}
                </a>
            </div>
        </div>
        `;


    }

    getTweetLinksSectionHTML(){
        const mainTweetLinkHTML = this.getMainTweetLinkHTML();
        let hashTagHTML = "";
        let urlHTML = "";

        if(this.tweet.hashtags.length>0) {
            hashTagHTML = this.getHashTagsHTML();
        }

        if(this.tweet.urls.length>0) {
            urlHTML = this.getUrlsHTML();
        }

        return `
        <div class="tweetlinks">
            ${mainTweetLinkHTML}
            ${hashTagHTML}
            ${urlHTML}
        </div>
        `;

    }

    getScreenNameLink(screenName, linkText){
        const pageName = this.pageNamePHP;
        return `<a href='${pageName}?screen_name=${screenName}' target='_blank'>${linkText}</a>`;
    }

    getTweetHeaderHTML(){

        const screenName = this.tweet.screenName;
        const currentUserHandle = this.currentUserHandle;

        const profile_image = this.tweet.profile_image;
        const profile_name_link_html_start = `<a href='https://twitter.com/${screenName}' target='_blank'>`;

        const searchSelectedHTML = "<button onclick='searchForHighlightedText()'>view selected text</button>";
        const searchEditSelectedHTML = "<button onclick='searchForHighlightedText(true)'>edit/view selected</button>";

        // added width on 20180105 because some people have large images (do not know how, but they do)
        const profile_image_html = `${profile_name_link_html_start} <img src='${profile_image}' width='48px'/></a>`;
        const profile_name_link_html = `${profile_name_link_html_start} ${screenName}</a> `+
            this.tweet.tweetUserDisplayName;

        const viewScreenNameFeed = " "+this.getScreenNameLink(screenName, "view feed");
        const compareViaSocialBlade =
            ` <a href='https://socialblade.com/twitter/compare/${currentUserHandle}/${screenName}'
                    target='_blank'>compare stats</a>`;

        const tweetUrl = this.tweet_link_url;


        const tweetpoet = `
        <a onclick="navigator.clipboard.writeText('${tweetUrl}').then(function() {window.open('https://poet.so')})">poet.so</a>
        `;


        const tweetpik = `
        <a onclick="navigator.clipboard.writeText('${tweetUrl}').then(function() {window.open('https://tweetpik.com/#app')})">tweetpik</a>
        `;

        const twipix = `
        <a onclick="navigator.clipboard.writeText('${tweetUrl}').then(function() {window.open('https://twipix.co/dash')})">twipix</a>
        `;

        const tweetimage = `
        <a onclick="navigator.clipboard.writeText('${tweetUrl}').then(function() {window.open('https://tweet-image.glitch.me')})">tweet-image</a>
        `;

        const twimage = `
        <a onclick="navigator.clipboard.writeText('${tweetUrl}').then(function() {window.open('https://twimage.vercel.app')})">twimage</a>
        `;


        const dropdown =`
        <div class="dropdown"><p class="droptopmenu">=====</p><div class="dropdown-content">
            ${viewScreenNameFeed}
            ${compareViaSocialBlade}
            __ Search __
            ${searchSelectedHTML}
            ${searchEditSelectedHTML}
            __ As Image __
            ${tweetpoet}
            ${tweetimage}
            ${twipix}
            ${twimage}
            ${tweetpik}
        </div></div>
        `;


        return `<div class='tweetheader'>${profile_image_html} &nbsp; <strong>${profile_name_link_html}</strong> (<a href='` +
            this.tweet_link_url +
        `' target='_blank'>`+this.tweet.created_at+`</a>) ${dropdown}</div>`;

    }

    getPHPBasedTweetPluginOutput(){
        if(this.tweet.tweetIsPossibleThread){
            return "<p>View Thread via ["+"<a href='https://threadreaderapp.com/thread/"+this.tweet.id+".html' target='_blank'>ThreadReader</a>]</p>";
        }
        return "";
    }

    getTweetAsHTML(){
        let html = "<div class='atweet' data-from-userid='"+this.tweet.tweetUserID+"' data-from-userhandle='"+this.tweet.screenName+"'";

        html = html+" data-tweetid='"+this.tweet.id+"' ";

        if(this.tweet.retweetingid.length>0){
            html = html+" data-retweeting='"+this.tweet.retweetingid+"' ";
        }

        html = html+">";


        html = html+this.getTweetHeaderHTML();

        html = html + this.getTweetContentsHTML();

        html = html + this.getTweetLinksSectionHTML();

        html = html + this.getPHPBasedTweetPluginOutput();
        html = html + "<details><summary class='small'>Plugins: muting</summary><div class='tweet-plugins-section'>"+
        "</div></details>";

        html = html+'<hr/>';
        html = html+"</div>";
        return html;
    }

    getTweetAsElem(){
        const elem = document.createElement('div');
        elem.classList.add("atweet");
        elem.setAttribute("data-from-userid", this.tweet.tweetUserID);
        elem.setAttribute("data-from-userhandle", this.tweet.screenName);
        elem.setAttribute("data-tweetid", this.tweet.id);

        if(this.tweet.retweetingid.length>0){
            elem.setAttribute("data-retweeting",this.tweet.retweetingid);
        }

//        let html = "<div class='atweet' data-from-userid='"+this.tweet.tweetUserID+"' data-from-userhandle='"+this.tweet.screenName+"'";

        // html = html+" data-tweetid='"+this.tweet.id+"' ";
        //
        // if(this.tweet.retweetingid.length>0){
        //     html = html+" data-retweeting='"+this.tweet.retweetingid+"' ";
        // }
        //
        // html = html+">";


        let html = this.getTweetHeaderHTML();

        html = html + this.getTweetContentsHTML();

        html = html + this.getTweetLinksSectionHTML();

        html = html + this.getPHPBasedTweetPluginOutput();
        html = html + "<details><summary class='small'>Plugins: muting</summary><div class='tweet-plugins-section'>"+
            "</div></details>";

        html = html+'<hr/>';
        //html = html+"</div>";

        elem.innerHTML = html;
        return elem;
    }

    tweetContainsHttpLink(){

        return this.tweet.urls.length!=0;

    }

    // function get_http_link(){
    //     $pos=0;
    //
    //     try {
    //         if (strpos($this->display_portion, 'http://') !== false) {
    //             $pos = strpos($this->display_portion, 'http://');
    //         }
    //
    //         if (strpos($this->display_portion, 'https://') !== false) {
    //             $pos = strpos($this->display_portion, 'https://');
    //         }
    //
    //         if (strpos($this->display_portion, ' ', $pos) !== false) {
    //             // ends with the space
    //             return substr($this->display_portion, $pos, strpos($this->display_portion, ' ', $pos) - $pos);
    //         } else {
    //             // till end of string
    //             return substr($this->display_portion, $pos);
    //         }
    //     }catch(Exception $e){
    //         return "Exception";
    //     }
    //     return "";
    // }
}
