<html>
<head>
    <title>ChatterScan - an Opinionated Minimal Twitter Reader</title>
    <?php
        require "config/config.php";
        require "includes/chatterscan_funcs.php";
        require "includes/metatags.php";
        $metatags["description"] = "A Free Twitter Feed and List Reader that only shows tweets and posts with links in them to make it easy to scan your feed for valuable information";
        outputMetaTags();
    ?>
    <?php require "config/env/".getEnvironmentName()."/ga.php";  ?>
</head>
<body>

<?php
require "includes/header.php";
?>

<?php access_app_button("Access The Application Here"); ?>


<?php
$include_file="config/branding/includes/chatterscan_index.php";
file_exists($include_file) AND include $include_file;
?>



<?php access_app_button("Access The Application Here"); ?>



<?php
require "includes/footer.php";
?>






</body>
</html>