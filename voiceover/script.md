# Voice-over script

Draft narration for the whole film. Each `[marker]` line starts at that marker
of the scene's timeline; `tools/vofit.mjs` estimates how long each line takes
to say and moves the markers so that the picture waits for the voice.

Tone: calm, plain, a little dry. "It", never "he" or "she". The refrain is
*next-token guesser*. Numbers are spelled out as they are spoken.

## scene1

[user-1] You've probably done this. You type a message…
[bot-1] …and something answers.
[user-2] You ask for help with a chore.
[bot-2] Seconds later, there it is: a polite letter to your noisy neighbour. It really feels like talking to someone.
[zoom-out] But who, or what, is on the other side?

## scene2

[character] Let's step back. Here you are, at your computer.
[cable] Your message leaves through a cable in the wall…
[split] …and travels a long way…
[server] …to a data centre. It's tempting to picture a friendly face in there.
[battery] Something powerful, always on.
[user-wire] It reads your message and writes back.
[many-users] And it does this for millions of people, all at once.

## scene3

[zoom-in] So let's take a closer look.
[unscrew] A few screws…
[cover-off] Behind the friendly face: LEDs and wires. The face was never real. What's real is inside: a machine. Let's go in.

## part1

[card] Part one. The machine.

## scene4a

[sentence] Take a sentence: it was raining outside, so he took a… what comes next?
[split] First, the text is cut into small pieces called tokens: whole words, or parts of words.
[column] The machine only works with numbers, so it uses a dictionary…
[lookup] …a fixed list of about fifty thousand tokens, each with its own number. Every token gets swapped for its number.
[fold] That's tokenization.

## scene4b

[embedding] Next comes embedding.
[close-up] Each number goes through a big table, and comes out as a set of directions. Picture a stack of dials, each pointing its own way: seven hundred and sixty-eight of them, in a small model.
[fold] That's where each token starts, before it has seen any context.
[rows] Every token gets its own stack.

## scene4c

[core] Now, the heart of the machine: the transformer layers. Think of them as columns of cogs.
[crank] Let's turn it by hand.
[layer-1] With each turn, the dials enter a layer, and its cogs nudge them.
[layer-2] The next layer nudges them again.
[layer-3] And again.
[more-layers] A real model does this dozens of times.
[layer-n] No magic here: just a long series of small, mechanical steps.

## scene4d

[unembed] Then comes the output.
[last-row] Only the last row matters: it holds what should come next.
[top5] It is compared with every token in the dictionary, and each token gets a probability.
[lookup] Read backwards, the dictionary turns numbers into words: hat, coat, bus…
[generative] Now, a surprise. The machine doesn't always take the top choice. It draws one at random, weighted by those probabilities. That's the G in GPT: generative.
[spin] It's why the same question can get different answers.
[pick] This time: coat.
[n+1] The new token joins the sentence. One turn of the machine, one token out.

## scene5a

[power] Of course, nobody turns a crank. Electricity does the work, and takes a lot of it.
[shrink] And the machine simply starts again.
[generate] One full pass for every token. It never writes a whole sentence, only the next token, over and over, until it produces a special token that means: stop.
[standby] Then it waits for the next request.
[envelope] The text is packed up, and sent back.

## scene5b

[zoom-out] We leave the machine…
[split] …and follow the answer home.
[deliver] Through the network, along the cable…
[reply] …and onto your screen.
[zoom-screen] A conversation on one side. On the other, a very large machine, guessing one token at a time.

## scene6

[sentence] But how does it use context? Take this sentence: he sat on the river bank.
[layer-1] Inside each layer is a key mechanism called attention.
[look-back] Each token looks back at the tokens before it, never ahead. The thicker the link, the more that token matters. For "bank", it's "river" that counts most, and it nudges the dial.
[all-at-once] In reality, this happens for all tokens at once.
[layer-2] And in every layer.
[predict-1] What comes next? "To", then "fish".
[side-input] Now a second sentence: he put money in the bank. "Bank" is the same token, with exactly the same dials.
[layer-1b] But this time, it looks back at "money".
[predict-2] And the prediction changes: "each month".
[compare] Same token, same start, two different directions. That's how context flows through the machine.

## scene7a

[riddle] Context can reach very far back. Here's a small whodunit, with clues scattered through the text.
[question] Who is the murderer?
[reply] Probably Colonel Mustard. Yet nobody taught it how to reason.

## scene7b

[context] All the text the machine can see at once is its context window.
[generate] It writes the answer as always, one token at a time.
[look-back] To guess the name, it looks back across the whole window, and a few links weigh far more than others: the rain, the shoes, the word "dry".
[guess] "Colonel" comes out on top. This is the essence of the machine: a good next-token guesser.
[as-if] And guessing well takes context, clues and facts. From the outside, it looks as if it were reasoning.

## part2

[card] Part two. Building it.

## scene8

[cog] How big is this machine?
[tune] Each cog is an adjustable weight: a setting for how strongly it acts.
[dozen] A dozen cogs: not much of a language model.
[gpt2] GPT-2, in 2019, had a hundred and twenty-four million weights.
[attention] Each attention head looks back in its own way.
[gpt3] Then sizes exploded. In 2020, GPT-3 reached a hundred and seventy-five billion.
[today] Today's largest models go beyond, to hundreds of billions.
[why] Why so many? Because language is immense: grammar, knowledge, situations, styles. A model of language has billions of knobs.

## scene9

[by-hand] Who sets billions of knobs? In traditional software, people do: a programmer specifies each step by hand.
[learning] Machine learning goes the other way around. Nobody sets the knobs. The data does.
[predict] Take one example. The machine predicts "house", but the true next token is "coat". That error can be measured.
[backprop] It travels back through the machine, and each cog is adjusted a little, to reduce it, layer by layer. This is backpropagation.
[round-2] Run the example again, and the error shrinks. A few rounds later: "coat".

## scene10

[sources] Now do that with almost everything ever written: the web, books, blogs, news, code.
[flood] Recipes, court rulings, poems, football reports, software manuals.
[problems] Each text becomes a series of guessing games: hide the next token, then guess it. Nobody has to label anything: the text holds its own answers.
[clusters] That makes trillions of problems, solved in parallel on huge clusters of computers.
[round-1] At first, the guesses are poor, and every mistake sends corrections to the cogs.
[round-2] Fewer mistakes.
[round-3] Fewer still.
[pretraining] This is pre-training: the P in GPT.
[tuned] What gets tuned? The transformer layers, the T in GPT, and the embedding table. As models grow, the layers take almost all the weights.

## scene11

[machine] Now, a confession: there are no cogs.
[x-ray] They were only a picture. These are electronic machines.
[vectors] A stack of dials is really a list of numbers: a vector.
[matrices] A column of cogs is really a grid of numbers: the weights.
[silicon] And all of this runs on chips called GPUs, built for exactly this kind of arithmetic.
[layers] A layer's weights are loaded from memory, thousands of cores multiply and add, and the numbers move on.
[scale] One token, through a model like GPT-3, takes about a hundred and seventy-five billion operations. By hand, five and a half thousand years. On a GPU, a fraction of a millisecond.
[training] Training repeats this a hundred thousand times, on thousands of chips, for weeks.
[conclusion] Scale is only possible at the speed of silicon. Not cogs anymore, but still a machine.

## part3

[card] Part three. From machine to assistant.

## scene12

[question] After pre-training, the model is a superb text completer, but not an assistant. Ask it a question…
[reply] …and it just carries on, the way a poem might. A likely continuation, not what you wanted.
[server] This is a raw, non-aligned model.
[fine-tuning] To make it helpful, we open the machine again.
[examples] We train it on examples of good answers, including when the right answer is to decline.
[more-examples] Same machine, same cogs. Far fewer examples, much smaller nudges.
[policy] Then, better answers get rewarded.
[aligned] This is alignment. Same machine, new behaviour.
[ask-again] Same question…
[answer] …and this time, an answer.
[still-guessing] It's still a next-token guesser. But now, the likely next tokens are a helpful answer.

## scene13

[title] So why do these models seem so good? Here's a proposed interpretation.
[request] Take a request: a web app for a bike repair shop.
[scaffold] In seconds, it writes a whole project, clean and structured. A person would still be on the first lines.
[adapted] And it's not generic: it's adapted to the need.
[expert] A trained expert may do better in places, but rarely this fast.
[others-work] Why? First, because thousands of people have solved almost the same problems, and published their work. The model has integrated it.
[scale] Second, because of scale: billions of knobs, tuned until it guesses well in an enormous number of contexts.
[limits] But look closer. This library does not exist. Examples were few here, and a likely guess is not a guaranteed one.
[follow-up] So you check, you report it, and it gets fixed.
[jumpstart] Often a very good first draft. An efficient jumpstarter, and knowledge gatherer.

## scene14

[task] What if it could check its own work? Give it a task.
[command] The machine still only writes text. But now a program runs that text, and the result comes back into its context. That's an agent.
[grounding] It runs the tests, and one fails. It reads the error, corrects the code, tries again. It's now grounded in what actually happens. That raises confidence, without guaranteeing anything.
[steps] Step by step, it can walk through much longer tasks.
[stochastic] But each next token is still a likely guess. And sometimes, the wheel lands on a bad one.
[reach] So we limit what it can reach: whatever tries to leave the fence gets stopped.
[human] And for what really matters, a human decides.
[control] "Almost right" is fine in a draft. It's risky in an action.

## scene15

[question] So, let's ask again. Who are you?
