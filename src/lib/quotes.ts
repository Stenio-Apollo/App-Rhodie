export const stoicQuotes = [
    '"The happiness of your life depends upon the quality of your thoughts." – Marcus Aurelius',
    '"We suffer more often in imagination than in reality." – Seneca',
    '"Man conquers the world by conquering himself." – Zeno of Citium',
    '"No man is free who is not master of himself." – Epictetus',
    '"If it is not right, do not do it; if it is not true, do not say it." – Marcus Aurelius',
    '"How long are you going to wait before you demand the best for yourself?" – Epictetus',
    '"He suffers more than necessary, who suffers before it is necessary." – Seneca',
    '"First say to yourself what you would be; and then do what you have to do." – Epictetus',
    '"To be even-minded is the greatest virtue." – Heraclitus',
    '"Be tolerant with others and strict with yourself." – Marcus Aurelius',
    '"Luck is what happens when preparation meets opportunity." – Seneca',
    '"Wealth consists not in having great possessions, but in having few wants." – Epictetus',
    '"To live a good life: We have the potential for it. If we learn to be indifferent to what makes no difference." – Marcus Aurelius',
    '"Don’t explain your philosophy. Embody it." – Epictetus',
    '"It is not things that disturb us, but our judgments about things." – Epictetus',
    '"No great thing is created suddenly." – Epictetus',
    '"Freedom is secured not by the fulfilling of one\'s desires, but by the removal of desire." – Epictetus',
    '"The greater the difficulty, the more glory in surmounting it." – Epictetus',
    '"A man should so live that his happiness shall depend as little as possible on external things." – Epictetus',
    '"No man is crushed by misfortune unless he has first been deceived by prosperity." – Seneca',

    '"Difficulties strengthen the mind, as labor does the body." – Seneca',
    '"Fire tests gold; adversity tests the brave." – Seneca',
    '"What stands in the way becomes the way." – Marcus Aurelius',
    '"The impediment to action advances action." – Marcus Aurelius',
    '"A gem cannot be polished without friction, nor a man perfected without trials." – Seneca',

    '"Very little is needed to make a happy life." – Marcus Aurelius',
    '"You have power over your mind—not outside events." – Marcus Aurelius',
    '"The soul becomes dyed with the color of its thoughts." – Marcus Aurelius',
    '"Waste no more time arguing what a good man should be. Be one." – Marcus Aurelius',
    '"Everything we hear is an opinion, not a fact." – Marcus Aurelius',

    '"How much longer are you going to wait before you become the person you are capable of being?" – Epictetus',
    '"Don\'t demand that things happen as you wish, but wish that they happen as they do happen." – Epictetus',
    '"Make the best use of what is in your power." – Epictetus',
    '"First learn the meaning of what you say, and then speak." – Epictetus',
    '"Circumstances don\'t make the man; they only reveal him." – Epictetus',

    '"Sometimes even to live is an act of courage." – Seneca',
    '"Brave men rejoice in adversity." – Seneca',
    '"The man who has anticipated the coming of troubles takes away their power when they arrive." – Seneca',
    '"No tree becomes rooted and sturdy unless many a wind assails it." – Seneca',
    '"It is the power of the mind to be unconquerable." – Seneca',

    '"True happiness is to enjoy the present without anxious dependence upon the future." – Seneca',
    '"He is most powerful who has power over himself." – Seneca',
    '"If you wish to be rich, do not add to your money, but subtract from your desires." – Epicurus',
    '"Contentment comes not from great wealth, but from few wants." – Stoic Principle',
    '"The wise man is satisfied with his lot." – Stoic Principle',

    '"Your habits create your future." – Modern Stoic',
    '"Discomfort is often the price of growth." – Modern Stoic',
    '"Control the controllable. Release the rest." – Modern Stoic',
    '"The obstacle is not your enemy; avoidance is." – Modern Stoic',
    '"Character is built when nobody is watching." – Modern Stoic',

    '"Peace begins where expectations end." – Modern Stoic',
    '"You do not rise to your goals; you fall to your systems." – Modern Stoic',
    '"Every reaction is a choice." – Modern Stoic',
    '"Discipline is remembering what you want most." – Modern Stoic',
    '"The strongest man is the one who governs himself." – Modern Stoic'

];

export function getDailyStoicQuote(date: string): string {
    // deterministic selection based on date string YYYY-MM-DD
    let hash = 0;
    for (let i = 0; i < date.length; i++) {
        hash = (hash * 31 + date.charCodeAt(i)) >>> 0;
    }
    const idx = hash % stoicQuotes.length;
    return stoicQuotes[idx];
}
