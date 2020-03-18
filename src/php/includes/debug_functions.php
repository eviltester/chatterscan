<?php
function debug_echo($text){

    global $ALLOW_DEBUG_MODE;

    if(!isset($ALLOW_DEBUG_MODE)){
        return;
    }

    if($ALLOW_DEBUG_MODE===false){
        return;
    }

    if(isset($_REQUEST['debug_mode'])){
        echo "<p>$text</p>";
    }
}

function is_debug_mode()
{
    global $ALLOW_DEBUG_MODE;
    return $ALLOW_DEBUG_MODE ? "true" : "false";
}

function debug_var_dump_pre($title, $dumpvar){

    global $ALLOW_DEBUG_MODE;

    if(!isset($ALLOW_DEBUG_MODE)){
        return;
    }

    if($ALLOW_DEBUG_MODE===false){
        return;
    }

    if(isset($_REQUEST['debug_mode'])){
        echo "<p>$title</p>";
        echo "<pre>";
        var_dump($dumpvar);
        echo "</pre>";
    }
}

function debug_var_dump_as_html_comment($title, $dumpvar)
{
    global $ALLOW_DEBUG_MODE;

    if(!isset($ALLOW_DEBUG_MODE)){
        return;
    }

    if($ALLOW_DEBUG_MODE===false){
    return;
    }

    if (isset($_REQUEST['debug_mode'])) {
        echo "<!-- $title";
        var_dump($dumpvar);
        echo " -->";
    }
}
?>