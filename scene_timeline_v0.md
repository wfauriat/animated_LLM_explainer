-- Genreral context

This animation is an attempt at explaining the inner mechanics and 
the different enabler components of modern large language models (LLMs).
The target audiance is "non-expert" (could be either scientist in a specific
field, different from LLMs or ML people or generalist computer scientist, or even
general population / layman). The idea is to convey the message with simple
visualization rather than precisely specific / accurate descriptions or 
equations. Maths should be kept to an absolute minimal. Visual and examples and
analogies should be prefered.


-- Sequence / Scene 1 (1st version done)

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


-- Sequence / Scene 2 (1st version done)

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


-- Sequence / Scene 3 (1st version done)

The human character fades out, the camera zooms in on the all-powerful, benevolent
server. Then top and bottom screws above a below the "human face cover" are unscrewed.
The "false" face is removed and eyes and mouth, on the back of the cover
are visibly only LEDS and wires. The inside of the box will them be zoomed in
and described in the following scene [the architecture of the layers inside
will be revealed in what follows : embedding, transformer layers, softmax N+1, etc].
On the bottom of the scene, there is a clearly visible battery [representing 
needed power, to power the machine], and energy is continuously flowing to the 
machine.

-- Sequence / Scene 4 (1st version done)

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


-- Sequence / Scene 5 (1st version done)

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


-- Sequence / Scene 6 (1st version done)

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


-- Sequence / Scene 7 (1st version done)

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


-- Sequence / Scene 8 

[sum up so far]
(for the builder - LLM and as working memory for me)
So far, we have shown the "inner workings" (assuming it's "built") : a machinery
with tokenization, embedding, transformer layers (cogs) with attention (top-down
connections between cogs), powered at remote premises, prompted via network
query messages, and sending its responses back to a user, in front of its terminal.
The user as the impression of seamless interaction with an "intelligent agent",
but he "trigerring" a large marchinery.
And we have show "what" that machinery produces : a very good next-token guesser, able
to integrate the provided context and produce good answers (as if by reasoning, using
a "model of the language"). 

[this scene]
On this scene, I want to illustrate the idea of scale. The next-token guesser
is somehow an "auto-completion" engine, but one with massive SCALE (say since 2019, 2020 up to now).
Here, the idea for visualization would be to show the core of the transformation
layers, with cogs (as the later have come to symbolize "weigths" : maybe the term
can appear here). At first a few (say a dozen) cogs are visible, on a few successive
forward oriented layers, then the camera zooms out, to reaveal more layers 
(12 I think on GPT2-small, now 96+ on modern models). Then a depth slice could 
expend also to allow to visualize the embedding depth (2, 3, 4, some ellipsis,
up to embeding 512 and up on modern models). A few figures (architecture numbers
and scale) can be given here, say from GPT-3 if they are available. So horizontal
layers times embedding depth make the scale grow to millions and up to billions of 
weights (cogs). The idea is to give an "idea" of scale, by zooming out progressively.
One analogy (for you to think of, not necessarily to use in the scene), is the astrology one,
first the scale of the planet, then the solar system, then our galaxy, then other
galaxies, then the universe. 
What could be written down on the scene something along the following :
"to model ALL language and its diversity, there is a lot of possiblities,
associations, situations, context to represent". Also : "the machinery has to
account for grammar, syntax, knowledge, facts, ...". So, "any model of language,
as "billions of knobs"".


-- Sequence / scene 9

Now that we have illustrated the machinery, made of a million of knobs [what is is,
and what it does : good next token guesser]. Now let us talk about HOW to build
it : through training. On this slide we will illustrate the divide between
traditionnal software (specified, predictable, stack of functions and abstractions 
with clear definition) and machine learning ["data is the code"]. 

In the scene, a split screen (diagonal). On the left, "traditional software" (write this as 
header), on the right "machine learning" (write it, and you may right "data is the code").
On both the left and the right panel, a handful of cogs with notches (12 cogs).
On the left, a caracter with its back turned to us (3/4), and a wrench, 
"tuning" notches successively, by hand [this is the "man made" tuning].
On the right panel, cogs "tuned automatically", on the rightmost part of the screen,
two boxes, on for the "true observation" (say "coat"), and one for the prediction
(say "house", a wrong prediction), a small linked connecting both with a negative tick
(in red), emulating a poor loss [or technically, cross entropy score]. Then, in the animation,
cogs are "auto-tuned" to correct last layer dials (a tiny bit), then moved backed to the
N-1 layer "auto-tuned" again (simulating auto-diff and backpropagation of error).
After tuning the cogs' notches enough, the prediction turns back to "coat", and
the tick becomes a green positive tick. [The idea is to display that with "learning",
the machine "tunes" "itself" on examples, not by hand]. The mechanics of last layer, then
N-1 layer, is the illustration of back-propagation and adjustment of weights.
Do not over-engineer, just the two last layers, a few dials, a few rotating notches,
and the prediction vs truth self-correcting back to green tick. For "auto-tuning"
and twisting of notches, what could be a good visualisation is that the 
comparaison (pred vs true) sends "tuning" signals (three superimposed waves, as
in "wifi" or "network" symbol). During this scene, the terms : traditional software,
machine learning, exemples, should be displayed. The term backpropagation (correcting
error, layer by layer) and auto-diff, could be displayed if there is a bit of room.


-- Sequence / scene 10

We will build on the idea of training on examples. Here in the center of the 
screen, you should display sources of informations : the web (a web of pages with
connections), books, blogs, newspaper (find relevent iconographies for these
sources). That is on the upper part. On the lower part, you will display next token 
prediction problems : It was ?? then It was rain ?? then It was rain ing ??
and so so on (say 6 to 8 successive problem for parallel training). Pick a different
color for the token to be predicted. You can display on the right : "parallel
training on a gigantic amount of text and contexts (trillions of tokens prediction
problems)." And idea, once this first set up as been visualised, would be to
flash sentences mouving from the center and then outward (north, northeast, east,
southeast, and so on). Differences sentences, from multiple contexts, flowing as a
rapid pace [in order to illustrate the amount of processed problem and texts].
You can end by displaying : "these tasks can me massively parallelise on 
enormous computer clusters". In a corner, you can display a remainder (in small)
of a handful (say 12) cogs nutches being very slowly adjusted and nudged. 

It should end with the screen getting dimed and the following text displayed : 
"This process is "Pre-Training" (the P in GPT)". 
The next block should read : what gets "tuned" => the stack of transformer (The T in GPT)
layers (approx 2/3 of the parameter count : attention heads + Feed-Forward Networks) 
+ the embedding table (approx 1/3 of the parameter count). 
Check the numbers, and try to make this display quite clear and readable


-- Sequence / scene 11

