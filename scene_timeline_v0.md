-- Genreral context

This animation is an attempt at explaining the inner mechanics and 
the different enabler components of modern large language models (LLMs).
The target audiance is "non-expert" (could be either scientist in a specific
field, different from LLMs or ML people or generalist computer scientist, or even
general population / layman). The idea is to convey the message with simple
visualization rather than precisely specific / accurate descriptions or 
equations. Maths should be kept to an absolute minimal. Visual and examples and
analogies should be prefered.


-- Sequence / Scene 1

A handful of text boxes (bubles, of the kind messaging apps use), introducing
the concept of "conversational agent"

First box on the top left reads : "Hello, who are you? " [it is the user's box,
in a given color, say light blue]

Second box on the right reads : "I am your favorite conversation agent or 'chat-bot'.
What can I help you with?" [LLM box, say in light green]

Third box down, on the left : (user again) " Help me write a complaint letter
to my noisy neighbour"

Forth and last box, on the right : [Beginning of the produced letter] "Dear Mr X,
After several reminders on the noise level, ... [some space] Regards."

The idea is to introduce the idea of some "entity" interacting with the user. 
The messaging thread, I feel is a commonly admitted image for "interaction"
with "someone".

Boxes should pop sequentially, with a bit of delay so that the audiance can read


-- Sequence / Scene 2

Split screen scene. On the bottom left pannel, a character, sat on a chair,
with its back turned to us, facing forward to a dimly lighted computer screen.
The user is typing on the keyboard. Computer is pluged via a visible cable, and 
light dots (signaling information flowing in the cable, all the way
through the network plug on the wall). On the top right pannel, many wires,
are connected to a central server [say at Anthropic, or openAI, or any other vendor],
lightning / information is flowing through the wires all the way to the server.
The server has a "human face", maybe in green LEDS [the idea is to play 
on the anthropomorphism tendancy, giving persona to a computer / server, to latter,
on the next slides, to revert on this misconception by open up the box and looking
inside]. So here, the central server should appear all-powerful, yet benevolent 
processing received information, as if engaging with all users.


-- Sequence / Scene 3

The human character fades out, the camera zooms in on the all-powerful, benevolent
server. Then top and bottom screws above a below the "human face cover" are unscrewed.
The "false" face is removed and eyes and mouth, on the back of the cover
are visibly only LEDS and wires. The inside of the box will them be zoomed in
and described in the following scene [the architecture of the layers inside
will be revealed in what follows : embedding, transformer layers, softmax N+1, etc].
On the bottom of the scene, there is a clearly visible battery [representing 
needed power, to power the machine], and energy is continuously flowing to the 
machine.

-- Sequence / Scene 4

This is a central piece of the animation, so it is quite dense.
The idea is to explain with a visualization that is as simple as possible,
the "inner workings" of modern LLM. So it does not tries to be perfectly accurate.
Still it wants to convey the following ideas / imaging / perception.
The language model is at core a "MACHINE", illustrated by sequential transformations
often made explicit though turning cogs / gears / wheels.
The different layers and transformation are unveilled sequentially from the left 
to the right. You have a scratch illustration I made in scene4_lay1.svg (let me know
me if you prefer a bitmap rather than a vector for analysis). In the illustration
I provided, most if not all of the material is present, but in the animation,
it has to be unveilled progressively, otherwise it will be too dense on the
audiance. One idea could be to center each next layer as it unveils, and then
compress it back and stack it horizontally to the previous layers. So that focus
has enough room to breath, and once it has been shown, it moves to the lefts and
folds (but this is not necessarily a strict solution to adhere to, you have
some liberty to iterate). Let us describre the different layers sequentially.
First, a sentence in tokens appears : "it was rain ing out side so he took a ??".
The sequence is converted in token indexes (numbers have been selected so be plausible,
even if not corresponding to a rigorous BPE tokenization or another proper
tokenization). The each token index corresponds to a particular embedding.
The idea of embedding is represented by oriented coordinates (looking like a 
compass), only 3 dimension are represented and they are stacked on the "depth"
dimension (perpendicular to screen) with ellipsis (meaning that dimension is higher).
Then, the core of the machinery, is the transformer layers (so far, we will not
mention "attention", it will come later in the animation). Rather than products
of numbers, to convey the idea of a sequence of "mechanical" operations (in reality
algebra), transformers are made of many cogs / gears, which will "nudge" the 
compasses (coordinates, representing kind of like a residual stream). The idea is to
represent the compasses going through a first layers of cogs, getting nudged, 
the first layer of cogs turns,
then a second, then a third, and so on. The perspective is made (only three dimensions),
so that those operation runs on all component of the embedded vector.
At the last layer, the top 5 most likely token index (the softmax) are displyed,
and then unembedding gives back the actual token. Another idea to convey the idea
of the "machine", is that with each movement through the layers (when flowing
the compasses through the transformer core), a crank handle is turned, which represent
the mechanical operation. Once a next token has been picked, it is appended to
the input window. Lastly on the scene, the crank handle is droped, a battery is
pluged (this is how the server operates), and cogs turns a bit, drawing power 
from the battery (to show that running the LLM predictor requires power, later
the discusion on electrical operation on GPUs will be discussed more precisely, 
here the idea is just to "power" a "machine", which "draws power").
The svg you work with does not have to be exactly followed, do whatever you feel
carries best the messages while getting inspired from my input.


-- Sequence / Scene 5

At the top of the screen, a text box (of the same kind of scene 1, assistant
color), a longer sentence is generated one token at the time : "It was raining
outside so he took a coat and an umbrella and walked to school at a rapid pace
< end >". While the token appear, a rotating cog is visible and rotates at 
each new appearing token (fast enough so that we don't spend too much time on
scene). Once the sentence is complete, it is folded into a small enveloppe 
(representing a HTTP package, let us not go into streaming) than is then sent
a moves into the wall plug, with the flow of information. On a split screen, 
the enveloppe gets out of another wall plug, at the client's house, the same
caracter (from scene 2) is view and the information reaches its screen and its
computer, and is displayed on screen. [The idea is to illustrate the request /
prompt, response cycle, and that the core of the LLM is hosted in remote
premises (at model's vendor), and that the response is sent back to the user
terminal]. [Another idea is that once the auto-regressive token production
reaches the "end" reason, the machinery "stops" or rather moves into 
stand-by / listening, until further sollicitation].


-- Sequence / Scene 6

We come back to the transformer core, with turning cogs. Here only the tokens
appear, not their index or the dictionary lookup.
A new sequence is used as a example, actually two sequences.
"He sat on the river bank" and "He puts money at the bank".
[The idea here is to illustrate the concept of "attention", in the decoder
architecture]. 
The idea is to show that the new tokens attend to the previous token, sat attends
to he, on attends to sat and he, and so on. So when the dials are presented to the 
first layer, they are impacted by the top layer cogs and by the cogs on their 
own row. (so far I am not exactly sure how to "exactly" sequence these action
and lay out the cogs and interaction, make me proposals).
Maybe it is too much to repeat on each row. Maybe it is better to highligh bank, 
(in a second phase), in both sentences, and show it attends to "sat" (so it
gives bank the sense of a river bank), and in the other situation to "money", so
bank in the money deposit sense. The idea is to show that context flows though 
the machine, and that latter dials are "nudge" by "influences" above.
On the right side of the transformer core, two alternative predictions are displayed
at the end : N+1 is "to" N+2 is "fish" (in one alternative), N+1 is "each" N+2 is
"month" (for the second alternative).


-- Sequence / Scene 7

Now that we have introduced the notion of context flowing forward to the "tip"
of the prediction sequence, we may keep that train of thoughs to do the following.
Discuss "emerging" "reasoning" (or what behave "as if" one were reasoning)
and long range attention within the "context window".
Also, I want to display some terminology : "good next token guesser".
[This is the essence of the language model, a machine that tries to guess
right, while integrating as much context as he as been given. And guessing right 
means taking into account, grammar, syntax, knowledge, facts, clues, etc.] 
In this scene, we re-use the interaction in the conversation app.
The user describe a longer context (in its text box). We will take the imaging
of the cluedo (a trivia to guess the name of the murderer). The user writes something
along the lines of (you may adjust, while keeping the idea) : "He walked
slowly into the kitchen. She was sitting in the living room drinking tea.
A large noise was heard upstairs. ..." Then the user asks : "who is the 
murderer". The assistant replies : "the murderer is most likely Colonel Mustard".
You may display, at the end of this animation : "guessing correctly means, looking
at context, clues, facts. (as if reasoning)"