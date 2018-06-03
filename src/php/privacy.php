<!DOCTYPE html>
<html>
<head>

    <title>ChatterScan.com Privacy Policy</title>
    <?php
    require "config/config.php";
    require "includes/metatags.php";
    require "includes/chatterscan_funcs.php";
    $metatags["description"] = "We value your privacy and do not store any of your data.";
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
$include_file="config/branding/includes/chatterscan_privacy.php";
file_exists($include_file) AND include $include_file;
?>


<?php
require "includes/footer.php";
?>

</body></html>