<?php

class UrlDisplay{
    public $urlHref;
    public $urlDisplay;

    function fromTwitterUrl($aURL){
        $this->urlHref = $aURL->expanded_url;
        $this->urlDisplay = $aURL->display_url;
    }
}

class TwitterResponse{

    public $isError=false;
    public $errorMessage="";
    public $errorCode;
    public $statuses=[];
    public $maxIdOnError;

    function fromResponse($statusesInResponse){
        foreach ($statusesInResponse as $value) {
            if (is_array($value) && isset($value[0]->message)) {
                $this->isError = true;
                $this->errorMessage = $value[0]->message;
                $this->errorCode = $value[0]->code;
                $this->maxIdOnError = $value[0]->id;
                break;
            } else {
                $aStatus = new TweetRepresentation();
                $aStatus->setFromTwitterValues($value);
                array_push($this->statuses, $aStatus);
            }
        }
    }

}

class TweetRepresentation {

    public $is_quote_status;
    public $possibly_sensitive;
    public $display_portion;
    public $full_text;
    public $screenName;
    public $tweetUserDisplayName;
    public $tweetIsPossibleThread=false;
    public $tweetIsReply=false;
    public $tweetUserID;
    public $profile_image;
    public $firstImageLink;
    public $retweetingid="";
    public $urls=[];
    public $hashtags=[];
    public $created_at;
    public $id;

    public $debug_info=[];

    function setFromTwitterValues($twitterValues){

        $this->is_quote_status = $twitterValues->is_quote_status;
        $this->possibly_sensitive = $twitterValues->possibly_sensitive;

        // need to get the display portion of the tweet - this is buggy information from twitter and leads to tweets being truncated
        // e.g. a 166 char tweet will have display range of 0 to 163
        $this->display_portion = substr($twitterValues->full_text,
                                    $twitterValues->display_text_range[0],
                                    $twitterValues->display_text_range[1]);
        $this->full_text = $twitterValues->full_text;

        $this->screenName = $twitterValues->user->screen_name;
        $this->tweetUserDisplayName = $twitterValues->user->name;
        $this->tweetUserID = $twitterValues->user->id;

        $this->created_at = $twitterValues->created_at;

        // force https
        $this->profile_image = str_replace("http://", "https://", $twitterValues->user->profile_image_url);

        $this->firstImageLink = $this->getFirstImageLink($twitterValues);

        $this->populateUrls($twitterValues);
        $this->populateHashtags($twitterValues);
        $this->id = $twitterValues->id;

        if($twitterValues->retweeted_status != null) {
            $this->retweetingid = $twitterValues->retweeted_status->id_str;
        }
        if($twitterValues->in_reply_to_screen_name != null) {
            $this->tweetIsReply = true;
        }
        if($twitterValues->in_reply_to_screen_name == $this->screenName){
            $this->tweetIsPossibleThread=true;
        }

        $this->debug_info["display_portion"] = $this->display_portion;
        $this->debug_info["full_tweet"] = $this->full_text;
        $this->debug_info["display range"] = "from ".$twitterValues->display_text_range[0]." to ".$twitterValues->display_text_range[1];
    }

    function getFirstImageLink($value){

        // find the first image
        try{
            if (isset($value->entities)) {
                if (isset($value->entities->media)) {
                    if (isset($value->entities->media[0])) {
                        if (isset($value->entities->media[0]->media_url_https)) {
                            return $value->entities->media[0]->media_url_https;
                        }
                    }
                }
            }
        } catch (Exception $e){

        }

        return "";
    }

    function populateUrls($value){
        try {
            if (isset($value->entities)) {
                if (isset($value->entities->urls)) {
                    $urlsArray = $value->entities->urls;
                    foreach ($urlsArray as $aURL) {
                        $newURL = new UrlDisplay();
                        $newURL->fromTwitterUrl($aURL);
                        array_push($this->urls, $newURL);
                    }
                }
            }
        } catch (Exception $e) {
        }
    }

    function populateHashtags($value){
        try {
            if (isset($value->entities)) {
                if (isset($value->entities->hashtags)) {
                    $hashtagsArray = $value->entities->hashtags;

                    foreach ($hashtagsArray as $aHashtag) {
                       array_push($this->hashtags, $aHashtag->text);
                    }
                }
            }
        } catch (Exception $e) {
        }
    }

    function getUrlCount(){
        return count($this->urls);
    }

    function getHashtagCount(){
        return count($this->hashtags);
    }

    function containsHttpLink(){

        return count($this->urls)!=0;

        if (strpos($this->display_portion, 'http://') !== false){
            return true;
        }

        if (strpos($this->display_portion, 'https://') !== false){
            return true;
        }

        return false;
    }

    function get_http_link(){
        $pos=0;

        try {
            if (strpos($this->display_portion, 'http://') !== false) {
                $pos = strpos($this->display_portion, 'http://');
            }

            if (strpos($this->display_portion, 'https://') !== false) {
               $pos = strpos($this->display_portion, 'https://');
            }

            if (strpos($this->display_portion, ' ', $pos) !== false) {
                // ends with the space
               return substr($this->display_portion, $pos, strpos($this->display_portion, ' ', $pos) - $pos);
            } else {
                // till end of string
                return substr($this->display_portion, $pos);
            }
        }catch(Exception $e){
            return "Exception";
        }
        return "";
    }
}

?>