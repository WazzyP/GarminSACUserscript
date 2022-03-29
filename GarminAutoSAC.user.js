// ==UserScript==
// @name        Adding automated SAC (and RMV) calculation to Garmin Connect
// @namespace   https://www.warrenprior.com/garminsac/
// @description Adding automated SAC (and RMV) calculation to Garmin Connect
// @version     0.5
// @match       https://connect.garmin.com/modern/activity/manual?typeKey=diving
// @match       https://connect.garmin.com/modern/activity/manual/*/edit
// @match       https://connect.garmin.com/*
// ==/UserScript==

/*** USER NOTES ***********************************************************************
* If you manually change average depth, the SAC values will not be recalculated
* This currently assumes only a single tank

* This has been tested with TamperMonkey, not GreaseMonkey

* 0.5 - Added RMV to tables
**************************************************************************************/

/*** TODO *****************************************************************************
* Build support for multiple tanks
* Add unit for RMV
* Consider adding a button to populate values for previous dives
  (rather than needeing to update values to trigger the calculation)
**************************************************************************************/

// time interval in ms for periodically checking for the add/edit tank modal
const modalCheckInterval = 500;

// round SAC to this many decimal points
const numDecPoints = 2;

// trigger the period check for the tank modal and gas table
setTimeout(checkForModal, modalCheckInterval);
setTimeout(checkForTankTable, modalCheckInterval);

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
This function creates a new cell by appending a div
**************************************************************************************/

function createCell(cell, text, cellType)
{
    cell.outerHTML = '<th>' + text + '</th>';
}

/**************************************************************************************
This function periodically checks whether the tank/gas table has been created,
and adds a new column for RMV
**************************************************************************************/

function checkForTankTable()
{
    var tankTableClass = document.getElementsByClassName('table gases-and-tanks-table'),
        gasesTableClass = document.getElementsByClassName('table tanks-and-gases-table'),
        tankTable, i, screen, tankSizeCell, pressureRateCell, tableWidth, addColumn;

    // get the table depending on whether we are in the view or edit screen
    if (tankTableClass.length >= 1)
    {
        tankTable = tankTableClass[0];
        screen = 'view';
        tankSizeCell = 5;
        pressureRateCell = 9;
        tableWidth = 10;
        addColumn = 10;
    }
    else if (gasesTableClass.length >= 1)
    {
        tankTable = gasesTableClass[0];
        screen = 'edit';
        tankSizeCell = 3;
        pressureRateCell = 6;
        tableWidth = 9;
        addColumn = 7;
    }
    else
    {
        screen = 'neither'
    }

    // if we have a table
    if(screen != 'neither')
    {
        // check the column has not already been added
        if(tankTable.rows[0].cells.length == tableWidth)
        {
            // loop through all tanks
            for (i = 0; i < tankTable.rows.length; i++)
            {
                // add the new heading
                if(i == 0)
                {
                    tankTable.rows[i].insertCell(addColumn).outerHTML = '<th>RMV</th>'
                }
                //add the cell/column
                else
                {
                    // get the tank size and pressure rate
                    var tankSize = tankTable.rows[i].cells[tankSizeCell].innerHTML.replace(/[^0-9\.]+/g,""),
                        pressureRate = tankTable.rows[i].cells[pressureRateCell].innerHTML.replace(/[^0-9\.]+/g,""),
                        RMV;

                    // confirm you have values for tank size and pressure rate
                    if(isNaN(tankSize) || isNaN(pressureRate) || tankSize == '' || pressureRate == '')
                    {
                        RMV = '--';
                    }
                    else
                    {
                        RMV = tankSize * pressureRate;
                    }

                    tankTable.rows[i].insertCell(addColumn).outerHTML = '<td>' + RMV + '</td>'
                }
            }
        }
    }

    setTimeout(checkForTankTable, modalCheckInterval);
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
