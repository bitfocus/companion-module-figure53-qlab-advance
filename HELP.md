# Help for the QLabFB module

What does QLab do?
QLab makes it simple to create intricate designs of light, sound, and video, which you play back during a live performance.
QLab allows you to lock in exactly how you want the light, sound, and video to play during your performance. When you’re done designing, you'll switch to “show mode” and run your show just by pressing “GO”.

Go over to [figure 53](https://figure53.com/) and checkout the software.

This (FB) module adds feedback and variables to the *QLab* module. Due to the nature and volume of information this module uses a TCP connection. This may cause a noticible increase in network traffic.

This module was tested against QLab4. Nothing specific to QLab4 is used, so QLab3 should work, too.

## Actions

The following actions are available:
* **Go:** Tell the current cue list of the given workspace to GO.
* **Pause:** Pause all currently running cues in the workspace.
* **Resume:** Un-pause all paused cues in the workspace.
* **Stop:** Stop playback but allow effects to continue rendering. e.g., playback stops, but reverbs decay naturally.
* **Panic:** Tell the workspace to panic. A panic is a brief gradual fade out leading into a hard stop. A double panic will trigger an immediate hard stop.
* **Reset:** Reset the workspace. Resetting stops all cues, returns the playhead to the top of the current cue list, and restores any temporary changes made to cues (such as retargeting via a Target cue or adjustments using a "live" OSC method.)
* **Next:** Move the selection down one cue.
* **Previous:** Move the selection up one cue.
* **Start (cue):** Start the specified cue. If the specified cue is playing, this command has no effect.
* **Preview:** Preview the selected cue without moving the Playhead.
* **Increase Prewait:** Increases the prewait time by given time for the selected cue
* **Decrease Prewait:** Decreases the prewait time by given time for the selected cue
* **Increase postwait:** Increases the postwait time by given time for the selected cue
* **Decrease postwait:** Decreases the postwait time by given time for the selected cue
* **Increase duration:** Increases the duration time by given time for the selected cue
* **Decrease duration:** Decreases the duration time by given time for the selected cue
* **Set/Unset Arm:** Set / Unset the Arm property of the selected cue
* **Set/Unset Autoload:** Set / Unset the Autoload property of the selected cue
* **Set Continue Mode:** Sets the continue mode of the selected cue
* **Set Cue Color:** Sets the color of the selected cue

There are presets included for most of these actions.

for additional actions please raise a feature request at [github](https://github.com/bitfocus/companion-module-qlab-advance/issues)

## Variables available

To use the following, replace INSTANCENAME with the name of your module instance.

* **$(INSTANCENAME:q_ver)**: Version of QLab attached
* **$(INSTANCENAME:n_id)**: UniqueID of the current Playhead Cue
* **$(INSTANCENAME:n_name)**: Name of the current Playhead Cue or [none]
* **$(INSTANCENAME:n_num)**: Number of the current Playhead Cue
* **$(INSTANCENAME:n_stat)**: Playhead Cue Status: "✕" if broken, "|" if loaded, ">" if running, "⏸" if paused, "⏯" if ready
* **$(INSTANCENAME:r_id)**: UniqueID of the current Running Cue
* **$(INSTANCENAME:r_name)**: Name of the current Running Cue or [none]
* **$(INSTANCENAME:r_num)**: Number of the current Running Cue
* **$(INSTANCENAME:r_stat)**: Running Cue Status: "✕" if broken, "|" if loaded, ">" if running, "⏸" if paused, "⏯" if ready

## Feedback available

* **Background Color of Playhead Cue**: Sets the button backgound to QLab color of the current playhead cue
* **Background Color of Running Cue**: Sets the button background to QLab color of the currently running cue

## OSC
This module connects to QLab on port 53000.

From Qlab preferences OSC controls tab make sure you have the "Use OSC controls" checkbox ticked.
![Qlab](images/qlab.jpg?raw=true "Qlab")
