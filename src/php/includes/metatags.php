<?php

// simple way to create metatags and override existing defaults

$metatags = ["description" => "ChatterScan is a free, simple Twitter Feed and List reader that shows you posts which contain links"];

// https://moz.com/blog/seo-meta-tags

function outputMetaTags(){
    global $metatags;

    echo '<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />';
    echo '<meta name=viewport content="width=device-width, initial-scale=1">';

    foreach($metatags as $key => $value){
        echo "<meta name='$key' content='$value'>";
    }
}

?>

<!-- Generic PureCSS Include from CDN -->
<link rel="stylesheet" href="https://unpkg.com/purecss@1.0.0/build/pure-min.css" integrity="sha384-nn4HPE8lTHyVtfCBi5yW9d20FjT8BJwUXyWZT9InLYax14RDjBj46LmSztkmNP9w" crossorigin="anonymous">
<link rel="stylesheet" href="config/branding/css/chatterscan.css"/>