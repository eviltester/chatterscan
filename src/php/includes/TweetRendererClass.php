<?php


class TweetRenderer{

    public $currentUserHandle="";
    public $pageNamePHP="mainview.php";
    public $tweet;

    private $tweet_link_url="";

    function forUserHandle($aHandle){
        $this->currentUserHandle = $aHandle;
    }

    function mainPage($phpFileName){
        $this->pageNamePHP = $phpFileName;
    }

    function tweetToRender($aTweet){
        $this->tweet = $aTweet;
        // could cache commonly used HTML or values here
        $this->tweet_link_url = $this->getTweetLinkURL();
    }

    private function getHashTagLinkHTML($hashTag){

        $encodedHashTagTerm = urlencode($hashTag);

        $pageHref = $this->pageNamePHP;

        return <<<EOR
<a href='${pageHref}?hashtag=${encodedHashTagTerm}' target='_blank'>
   <button>${hashTag}</button>
</a>
EOR;

    }

    private function getHashTagsHTML(){
        $hashtagsArray = $this->tweet->hashtags;
        $hashTagHtml = "";

        foreach ($hashtagsArray as $hashTagTerm) {
            $hashTagHtml = $hashTagHtml . $this->getHashTagLinkHTML($hashTagTerm). " ";
        }

        return <<<EOR
<div class='hashtags'>${hashTagHtml}</div>
EOR;

        //return $hashTagHtml;
    }

    // occasionally see "this site can't provide secure connection" from twitter with shortened urls
    // thought about adding an expander here
    // unshorten.me has an api https://unshorten.me/api
    // unshorten link has a GET request format https://unshorten.link/check?url=http://goo.gl/B2ZDUr
    // link unshorten has a GET request format https://linkunshorten.com/?url=https%3A%2F%2Fgoo.gl%2FtFM2Ya
    private function getUrlsHTML(){

        $urlsArray=$this->tweet->urls;
        $urlsInnerHTML="";

        $numberOfUrls = count($urlsArray);

        if ($numberOfUrls <= 0) {
            return "";
        }

        foreach ($urlsArray as $aURL) {
            $urlHref = $aURL->urlHref;
            $encodedUrlHref = urlencode($urlHref);
            $urlDisplay = $aURL->urlDisplay;

            $urlsli = <<<URLSHTML
<li>
 <a href='${urlHref}' target='_blank'>${urlDisplay}</a> expanded: 
 <a href='https://unshorten.link/check?url=${encodedUrlHref}' 
    target='_blank'>[unshorten.link]</a>
 <a href='https://linkunshorten.com/?url=$encodedUrlHref' 
    target='_blank'>[linkunshorten.com]</a>
</li>
URLSHTML;
            $urlsInnerHTML = $urlsInnerHTML . $urlsli;
        }

        return <<<EOR
<details>
   <summary>urls</summary>
   <div class='urls'>
      <ul>
        ${urlsInnerHTML} 
      </ul>
   </div>
</details>
EOR;

    }

    public function getTweetLinkURL(){
        return "https://twitter.com/".$this->tweet->screenName."/status/".$this->tweet->id;
    }

    private function getTweetImageHtml(){
        if(strlen($this->tweet->firstImageLink)>0){
            return "<img src='".$this->tweet->firstImageLink."' width=150/>";
        }else{
            return "";
        }
    }

    private function getMainTweetLinkHTML(){

        return "<h3 style='text-align: center'><a href='".$this->tweet_link_url."' target='_blank'>view tweet</a></h3>";
    }

    private function convertTwitterHandlesIntoLinks($tweetText){

        // twitter handle @[a-zA-Z0-9_]

        return preg_replace_callback(
            '/@[a-zA-Z0-9_]*/',
            function($match){ return $this->getScreenNameLink(substr($match[0], 1), $match[0]); },
            $tweetText
        );

    }
    private function getTweetContentsHTML(){

        $imageHtml = $this->getTweetImageHtml();
        $twitterHandleLinks = $this->convertTwitterHandlesIntoLinks($this->tweet->full_text);
        $fullText = $this->tweet->full_text;
        $hrefUrl = $this->tweet_link_url;
        $postClass = "textbit";
        if(strlen($imageHtml)>0){
            $postClass = "textwithimagebit";
        }

        return <<<ASHTML
<div class='tweetcontents'>
   <div class='${postClass}'>
        <h2 class='tweet-text'>${twitterHandleLinks}</h2>
        <!-- ${fullText} -->
   </div>
   <div class='imagebit'>
        <a href='${hrefUrl}' target='_blank'>
            ${imageHtml}
        </a>
    </div>
</div>
ASHTML;


    }

    private function getTweetLinksSectionHTML(){
        $mainTweetLinkHTML = $this->getMainTweetLinkHTML();
        $hashTagHTML = "";
        $urlHTML = "";

        if(count($this->tweet->hashtags)>0) {
            $hashTagHTML = $this->getHashTagsHTML();
        }

        if(count($this->tweet->urls)>0) {
            $urlHTML = $this->getUrlsHTML();
        }

        return <<<ASHTML
<div class="tweetlinks">
    ${mainTweetLinkHTML}
    ${hashTagHTML}
    ${urlHTML}
</div>    
ASHTML;

    }

    function getScreenNameLink($screenName, $linkText){
        return "<a href='".$this->pageNamePHP."?screen_name=".$screenName."' target='_blank'>".$linkText."</a>";
    }

    private function getTweetHeaderHTML(){

        $screenName = $this->tweet->screenName;

        $profile_image = $this->tweet->profile_image;
        $profile_name_link_html_start = "<a href='https://twitter.com/$screenName' target='_blank'>";

        $searchSelectedHTML = "<button onclick='searchForHighlightedText()'>view selected text</button>";
        $searchEditSelectedHTML = "<button onclick='searchForHighlightedText(true)'>edit/view selected</button>";

        // added width on 20180105 because some people have large images (do not know how, but they do)
        $profile_image_html = "$profile_name_link_html_start <img src='$profile_image' width='48px'/></a>";
        $profile_name_link_html = "$profile_name_link_html_start $screenName</a> ".
                                $this->tweet->tweetUserDisplayName;

        $viewScreenNameFeed = " ".$this->getScreenNameLink($screenName, "view feed");
        $compareViaSocialBlade = " <a href='https://socialblade.com/twitter/compare/".
                                $this->currentUserHandle."/$screenName' target='_blank'>compare stats</a>";

        $tweetUrl = $this->tweet_link_url;


        $tweetpoet = <<<EOPC
<a onclick="navigator.clipboard.writeText('${tweetUrl}').then(function() {window.open('https://poet.so')})">poet.so</a>
EOPC;


        $tweetpik = <<<EOTC
<a onclick="navigator.clipboard.writeText('${tweetUrl}').then(function() {window.open('https://tweetpik.com/#app')})">tweetpik</a>
EOTC;

        $twipix = <<<EOTPX
<a onclick="navigator.clipboard.writeText('${tweetUrl}').then(function() {window.open('https://twipix.co/dash')})">twipix</a>
EOTPX;

        $tweetimage = <<<EOTIMG
<a onclick="navigator.clipboard.writeText('${tweetUrl}').then(function() {window.open('https://tweet-image.glitch.me')})">tweet-image</a>
EOTIMG;

        $twimage = <<<EOTIMG
<a onclick="navigator.clipboard.writeText('${tweetUrl}').then(function() {window.open('https://twimage.vercel.app')})">twimage</a>
EOTIMG;


        $dropdown =<<<DROPDOWN
<div class="dropdown"><p class="droptopmenu">=====</p><div class="dropdown-content">
$viewScreenNameFeed
$compareViaSocialBlade
__ Search __
$searchSelectedHTML
$searchEditSelectedHTML
__ As Image __
$tweetpoet
$tweetimage
$twipix
$twimage
$tweetpik
</div></div>
DROPDOWN;


        return "<div class='tweetheader'>$profile_image_html &nbsp; <strong>$profile_name_link_html</strong> (<a href='"
                .$this->tweet_link_url.
                "' target='_blank'>".$this->tweet->created_at."</a>) $dropdown</div>";

    }

    private function getPHPBasedTweetPluginOutput(){
        if($this->tweet->tweetIsPossibleThread){
            return "<p>View Thread via ["."<a href='https://threadreaderapp.com/thread/".$this->tweet->id.".html' target='_blank'>ThreadReader</a>]</p>";
        }
        return "";
    }

    public function getTweetAsHTML(){
        $html = "<div class='atweet' data-from-userid='".$this->tweet->tweetUserID."' data-from-userhandle='".$this->tweet->screenName."'";

        $html = $html." data-tweetid='".$this->tweet->id."' ";

        if(strlen($this->tweet->retweetingid)>0){
            $html = $html." data-retweeting='".$this->tweet->retweetingid."' ";
        }

        $html = $html.">";


        $html = $html.
            $this->getTweetHeaderHTML();

        $html = $html . $this->getTweetContentsHTML();

        $html = $html.
            $this->getTweetLinksSectionHTML();

        $html = $html.$this->getPHPBasedTweetPluginOutput();
        $html = $html."<details><summary class='small'>Plugins: muting</summary><div class='tweet-plugins-section'>".
                "</div></details>";

        $html = $html.'<hr/>';
        $html = $html."</div>";
        return $html;
    }
}
?>