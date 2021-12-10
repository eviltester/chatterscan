<?php

class ShowTweetDecider
{

    // reasons
    public $hidden_retweet_ignore=false;
    public $hidden_possibly_sensitive=false;
    public $hidden_no_links=false;
    public $hidden_has_links=false;
    public $hidden_reply=false;
    public $ignore=false;

    // decision log
    public $debug_info = [];

    function decideIfTweetShown($filters, $value){

        $this->debug_info["decideIfTweetShown"] = "processing tweet to decide if shown";

        if($filters->ignore_retweets){
            // if it is a retweet then ignore
            if($value->is_quote_status){
                $this->ignore=true;
                $this->debug_info["ignore_retweets"] = "Ignored because is_quote_status reported tweet as a quote";
                $this->hidden_retweet_ignore=true;
            }else{
                $this->debug_info["ignore_retweets"] = "Included because is_quote_status reported tweet as not being a quote";
            }
        }

        // todo: if threadedreplies is on then it overrides the 'reply' settings need to make that clear in the GUI
        if(!$filters->show_threaded_replies){
            if($value->tweetIsReply){
                if($value->tweetIsPossibleThread){
                    // show it
                    $this->debug_info["threaded_reply"] = "Included because threaded reply";
                }else {
                    $this->ignore = true;
                    $this->debug_info["threaded_reply"] = "Ignored because not a threaded reply";
                    $this->hidden_reply = true;
                }
            }
        }

        // if it is possibly sensitive then ignore
        // supposed to only be set if tweet has a link - but that isn't true
        if(isset($value->possibly_sensitive)){
            if($value->possibly_sensitive) {
                $this->ignore = true;
                $this->debug_info["possibly_sensitive"] = "Ignored because Marked as possibly_sensitive";
                $this->hidden_possibly_sensitive=true;
            }else{
                $this->debug_info["possibly_sensitive"] = "Included because not Marked as possibly_sensitive";
            }
        }


        // if it does not include http
        if (!$value->hasHttpLink) {
            $debug_info["included http?"] = "It did not include http";
            if(!$filters->include_without_links) {
                $this->ignore = true;
                $this->debug_info["include_without_links"] = "IGNORED we are set to not include_without_links";
                $this->hidden_no_links=true;
            }else{
                $this->debug_info["include_without_links"] = "SHown we are set to include_without_links";
            }
        }

        return $this->ignore;
    }
}

?>