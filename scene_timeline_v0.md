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

To be completed (I will provide a visual)

Let us attempt to produce the first scene before going to far, and adjusting what
seems to need adjusting (effort level in design, types of actions, ...)