// ==UserScript==
// @name        Adding automated SAC (and RMV) calculation to Garmin Connect
// @namespace   https://www.warrenprior.com/garminsac/
// @description Adding automated SAC (and RMV) calculation to Garmin Connect
// @version     0.3
// @match       https://connect.garmin.com/modern/activity/manual?typeKey=diving
// @match       https://connect.garmin.com/modern/activity/manual/*/edit
// ==/UserScript==

/*** USER NOTES ***********************************************************************
* If you manually change average depth, the SAC values will not be recalculated
* This currently assumes only a single tank

* This has been tested with TamperMonkey, not GreaseMonkey
**************************************************************************************/

/*** TODO *****************************************************************************
* Build support for multiple tanks
* Add an RMV column to the tanks table
* Consider adding a button to populate values for previous dives
  (rather than needeing to update values to trigger the calculation)
**************************************************************************************/

// time interval in ms for periodically checking for the add/edit tank modal
const modalCheckInterval = 500;

// round SAC to this many decimal points
const numDecPoints = 2;

// trigger the period check for the tank modal
setTimeout(checkForModal, modalCheckInterval);

/**************************************************************************************
This function periodically checks whether the add/edit tank modal has been created,
and adds the necessary actions if it has
**************************************************************************************/

function checkForModal()
{
    var endingPressure = document.getElementById('endingPressure');

    // add listeners if the modal has been created, and the listeners do not already exist
    if ((endingPressure) && (endingPressure.getAttribute('listener') !== 'true'))
    {
        AddTankAction();
    }

    setTimeout(checkForModal, modalCheckInterval);
}

/**************************************************************************************
This function adds actions to the add/edit tank modal to automagically calculate SAC
**************************************************************************************/

function AddTankAction()
{
    // Add listeners to tank size, starting pressure, and ending pressure
    document.getElementById("tankSize").addEventListener("input", CalcSACAction, false);
    document.getElementById("startingPressure").addEventListener("input", CalcSACAction, false);
    document.getElementById("endingPressure").addEventListener("input", CalcSACAction, false);

    // Set attribute to indicate listener was added
    document.getElementById("endingPressure").setAttribute('listener', 'true');
}


/**************************************************************************************
This function performs SAC caclculations and populated the SAC field in the tank modal
**************************************************************************************/

function CalcSACAction()
{
    // * 1 to force conversion of string to int
    var startingPressure = document.getElementById("startingPressure").value;
    var endingPressure = document.getElementById("endingPressure").value;
    var tankSize = document.getElementById("tankSize").value;
    var averageDepth = document.getElementById("averageDepth").value;
    var bottomMinutes = document.querySelector('[id^="bottomTime_"][id$="-time-minute"]').value * 1;
    var bottomHours = document.querySelector('[id^="bottomTime_"][id$="-time-hour"]').value * 1;
    var ata = 0;

    // calculate pressure depending on whether depth is in feet or meters
    if (document.getElementById("averageDepthSelect").value == "metric")
    {
        // metric
        ata = (averageDepth / 10) + 1;
    }
    else
    {
        // imperial
        ata = (averageDepth / 33) + 1;
    }

    // check values are valid and numbers
    if ((isNaN(startingPressure) || isNaN(endingPressure) || isNaN(tankSize) || isNaN(averageDepth) || isNaN(bottomMinutes) || isNaN(bottomHours) || endingPressure == "" || averageDepth == ""))
    {
        document.getElementById("sacRate").value = "";
        return;
    }

    // convert bottom time to minutes (excluding seconds)
    bottomMinutes = bottomMinutes + (bottomHours * 60);

    // confirm gas used > 0 and confirm tank size > 0
    if (startingPressure - endingPressure <= 0)
    {
        document.getElementById("sacRate").value = "";
        return;
    }

    // SAC calculation
    var sacRate = (startingPressure - endingPressure) / (bottomMinutes * ata);

    // round to 3 decimal places
    document.getElementById("sacRate").value = sacRate.toFixed(numDecPoints);
}
