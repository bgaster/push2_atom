# Push 2 script for Atom Piano Roll 2.0
 
I love the workflow of Push and Ableton, but I really wanted something that was not my laptop to replace
my OP-1 workflow, with a bit more flexibility, and so I recently jumped into the 
music making world of iOS. It's so much fun and I generally find my self making lots
of music on the iPad, often returning with stems to Ableton, or in some cases making 
samples, drum kits, and so on in Ableton and moving them for musicial ideas in 
iOS. It's a really great workflow for me. However, while I have other midi controllers, 
I found myself really missing the Push and I used to the layout. However, unlike Novation’s controllers the Push is really difficult to use without Ableton, it requires the host software to understand Push in a way that is not required for many other controllers. 

So over the last couple of month’s I’ve been on a mission, late at night, to try and get a reasonable workflow with the Push 2 and AUM. For this I’ve developed a small auv3 MIDI controller that works with the Push is designed to work with Marek Bereza’s [Koala Sampler]( https://apps.apple.com/gb/app/koala-sampler/id1449584007), coming to the App store soon. This app is designed to work using the Push 2 as a controller for Koala. Additionally, I wanted a more general clip launcher, MIDI keyboard, and also a simple controller Elliott Garage’s 
sEGments. For this I needed something that worked as MIDI sequencer and clip launcher. 

Enter [Atom Piano Roll 2.0](https://apps.apple.com/us/app/atom-piano-roll-2/id1536259776), 
developed by Victor Porof, which is a MIDI sequencer and clip launcher for iPad. It is 
designed to be used in Auv3 hosts, such as [AUM]( https://apps.apple.com/us/app/aum-audio-mixer/id1055636344).

One of the really cool things about Atom 2, is it lets you extend it with your own code to support different hardware Midi controllers. For example, it comes with support for Novation's Launchpad. Atom can be extended using Javascript combined with its [API](https://github.com/victorporof/atom). This repo provides a script for Push 2, which supports the following features:

   - Clip launcher
      - Launch 
      - Record
      - Note and step input
      - Scene launching
      - Auto-grid layout
      - Auto-routing
      - Track Mute/Solo
   - Note mode
      - In key mode
      - Chromatic mode
   - Scales
      - Major
      - Minor
      - Dorian
      - (easy to add more, I just don’t use them much.)
   - sGElements controller

# Install

Simply copy the *Push2.js* script to the directory:

```
iCloud Drive/Atom/Piano Roll 2.0.3/Controllers/
```
Once installed you need to enable the script by going to setting menu, the hamburger menu on the top right of the auv3, click on “TOGGLE SCRIPTS”, and select *Push2*. 

# How does it work

To keep things short, please first read the pages, in Atom’s [manual]( https://tinyurl.com/Atom2Manual), on clip launching and using the Launchpad pro. The Push 2 interface is very similar, for example, it will launch in clip mode, depending on how many instances of Atom you have loaded will provide the ability to launch them as clips. Additionally, the following keys are supported:

   -	Record arms the tracks, select a pad to put into record mode
   -	Mute/Solo toggles tracks into mute or solo mode
   -	Launch a scene with one of the “>” keys
   -	Stop a clip by pressing an empty one in that track or use the stop clip, if the track has no empty tracks.
   -	Stop a scene my pressing a scene with no tracks
   -	Scale allows you to select the root note and a scale, currently only Major, Minor, and Dorian are supported.
   -	Pressing note once will enter note mode, by default an in key keyboard, similar to Ableton’s Push 2. Pressing note again will enter sEGments mode, which the bottom left 4x4 pads map to sEGements first 16 pads, and the bottom right 4x4 pads to sEGments 2nd 16 pads (this requires an IAP to enable in sEGments).
