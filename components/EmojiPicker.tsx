import { useState, useEffect, useRef } from 'react'

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void
  onClose: () => void
}

const EMOJI_DATA = [
  // Top expressions and reactions
  { emoji: '😂', keywords: ['laugh', 'crying', 'tears', 'joy', 'funny', 'lol', 'hilarious'] },
  { emoji: '❤️', keywords: ['heart', 'love', 'red', 'romance', 'valentine', 'care'] },
  { emoji: '🥰', keywords: ['love', 'hearts', 'adore', 'cute', 'affection', 'smiling'] },
  { emoji: '😍', keywords: ['love', 'heart eyes', 'adore', 'crush', 'smitten', 'amazed'] },
  { emoji: '😊', keywords: ['smile', 'happy', 'pleased', 'content', 'cheerful'] },
  { emoji: '😘', keywords: ['kiss', 'blow kiss', 'love', 'smooch', 'affection'] },
  { emoji: '🥺', keywords: ['pleading', 'puppy eyes', 'cute', 'sad', 'begging', 'please'] },
  { emoji: '😭', keywords: ['crying', 'tears', 'sobbing', 'very sad', 'emotional'] },
  { emoji: '😢', keywords: ['sad', 'cry', 'tear', 'upset', 'crying', 'disappointed'] },
  { emoji: '🤣', keywords: ['rolling', 'laugh', 'hilarious', 'funny', 'rofl', 'lmao'] },
  
  // Popular gestures and hands
  { emoji: '👍', keywords: ['thumbs up', 'like', 'good', 'yes', 'approve', 'agree'] },
  { emoji: '👎', keywords: ['thumbs down', 'dislike', 'bad', 'no', 'disapprove'] },
  { emoji: '👏', keywords: ['clap', 'applause', 'congratulations', 'well done', 'bravo'] },
  { emoji: '🙏', keywords: ['pray', 'please', 'thank you', 'hands', 'grateful', 'namaste'] },
  { emoji: '💪', keywords: ['muscle', 'strong', 'strength', 'flex', 'power', 'workout'] },
  { emoji: '🤝', keywords: ['handshake', 'deal', 'agreement', 'partnership', 'greeting'] },
  { emoji: '👌', keywords: ['ok', 'perfect', 'good', 'fine', 'agree', 'excellent'] },
  { emoji: '✌️', keywords: ['peace', 'victory', 'two', 'fingers', 'cool'] },
  { emoji: '🤞', keywords: ['crossed fingers', 'hope', 'luck', 'wish', 'good luck'] },
  { emoji: '👊', keywords: ['fist', 'punch', 'bump', 'power', 'solidarity'] },
  
  // More expressions
  { emoji: '😉', keywords: ['wink', 'flirt', 'playful', 'cheeky', 'joke'] },
  { emoji: '😎', keywords: ['cool', 'sunglasses', 'awesome', 'swag', 'confident'] },
  { emoji: '🤔', keywords: ['thinking', 'hmm', 'consider', 'wonder', 'confused'] },
  { emoji: '😴', keywords: ['sleep', 'tired', 'sleepy', 'zzz', 'rest', 'boring'] },
  { emoji: '🤗', keywords: ['hug', 'embrace', 'cuddle', 'comfort', 'caring'] },
  { emoji: '🤩', keywords: ['star eyes', 'amazed', 'impressed', 'wow', 'excited'] },
  { emoji: '😇', keywords: ['angel', 'innocent', 'halo', 'pure', 'good'] },
  { emoji: '🤯', keywords: ['mind blown', 'explode', 'shocked', 'amazed', 'surprised'] },
  { emoji: '🙄', keywords: ['eye roll', 'annoyed', 'whatever', 'sarcastic', 'bored'] },
  { emoji: '😏', keywords: ['smirk', 'sly', 'mischievous', 'cheeky', 'knowing'] },
  { emoji: '😬', keywords: ['grimace', 'awkward', 'cringe', 'uncomfortable', 'oops'] },
  { emoji: '😡', keywords: ['angry', 'mad', 'rage', 'furious', 'red', 'upset'] },
  { emoji: '🥳', keywords: ['party', 'celebrate', 'birthday', 'festive', 'celebration'] },
  { emoji: '😮', keywords: ['surprised', 'shock', 'wow', 'open mouth', 'amazed'] },
  { emoji: '😤', keywords: ['huffing', 'frustrated', 'annoyed', 'steam', 'mad'] },
  { emoji: '🤪', keywords: ['crazy', 'silly', 'goofy', 'wacky', 'fun', 'wild'] },
  { emoji: '😜', keywords: ['wink', 'tongue', 'playful', 'silly', 'teasing'] },
  { emoji: '🤤', keywords: ['drooling', 'hungry', 'want', 'desire', 'yummy'] },
  { emoji: '😋', keywords: ['yum', 'delicious', 'tasty', 'hungry', 'food', 'savoring'] },
  { emoji: '🙃', keywords: ['upside down', 'silly', 'sarcastic', 'ironic', 'playful'] },
  
  // Symbols and objects
  { emoji: '🔥', keywords: ['fire', 'hot', 'burn', 'lit', 'amazing', 'trending'] },
  { emoji: '💯', keywords: ['hundred', 'perfect', 'score', 'complete', 'full', 'excellent'] },
  { emoji: '🎉', keywords: ['party', 'celebrate', 'confetti', 'celebration', 'congratulations'] },
  { emoji: '🚀', keywords: ['rocket', 'launch', 'space', 'fast', 'takeoff', 'blast off'] },
  { emoji: '⭐', keywords: ['star', 'favorite', 'excellent', 'amazing', 'quality'] },
  { emoji: '✨', keywords: ['sparkles', 'magic', 'shine', 'glitter', 'special'] },
  { emoji: '💫', keywords: ['dizzy', 'sparkle', 'magic', 'wonder', 'stellar'] },
  { emoji: '🌟', keywords: ['glowing star', 'bright', 'excellent', 'outstanding'] },
  { emoji: '⚡', keywords: ['lightning', 'electric', 'energy', 'power', 'fast'] },
  { emoji: '🎯', keywords: ['target', 'bullseye', 'goal', 'accurate', 'perfect'] },
  { emoji: '🏆', keywords: ['trophy', 'winner', 'champion', 'victory', 'success'] },
  { emoji: '🎨', keywords: ['art', 'creative', 'paint', 'design', 'artistic'] },
  { emoji: '📸', keywords: ['camera', 'photo', 'picture', 'snap', 'capture'] },
  { emoji: '🌈', keywords: ['rainbow', 'colorful', 'beautiful', 'hope', 'pride'] },
  { emoji: '💝', keywords: ['gift', 'present', 'wrapped', 'surprise'] },
  
  // Nature and animals
  { emoji: '🦄', keywords: ['unicorn', 'magical', 'fantasy', 'rare', 'special'] },
  { emoji: '🐲', keywords: ['dragon', 'fantasy', 'mythical', 'fire', 'powerful', 'chinese'] },
  { emoji: '🐉', keywords: ['dragon', 'chinese dragon', 'mythology', 'luck', 'power'] },
  { emoji: '🐶', keywords: ['dog', 'puppy', 'cute', 'pet', 'loyal', 'woof'] },
  { emoji: '🐱', keywords: ['cat', 'kitten', 'cute', 'pet', 'meow', 'feline'] },
  { emoji: '🦋', keywords: ['butterfly', 'beautiful', 'transformation', 'nature'] },
  { emoji: '🌺', keywords: ['flower', 'beautiful', 'nature', 'bloom', 'tropical'] },
  { emoji: '🌸', keywords: ['cherry blossom', 'flower', 'spring', 'pink', 'delicate'] },
  { emoji: '🌹', keywords: ['rose', 'flower', 'love', 'romance', 'red', 'beautiful'] },
  { emoji: '🌻', keywords: ['sunflower', 'bright', 'happy', 'yellow', 'sunshine'] },
  { emoji: '🍀', keywords: ['four leaf clover', 'luck', 'fortune', 'irish', 'green'] },
  { emoji: '🌙', keywords: ['moon', 'night', 'crescent', 'sleep', 'peaceful'] },
  { emoji: '☀️', keywords: ['sun', 'sunny', 'bright', 'day', 'warm', 'happy'] },
  { emoji: '🌊', keywords: ['wave', 'ocean', 'water', 'beach', 'surf'] },
  { emoji: '🗻', keywords: ['mountain', 'fuji', 'peak', 'nature', 'high', 'climb'] },
  { emoji: '🏔️', keywords: ['snow mountain', 'peak', 'cold', 'winter', 'alpine', 'skiing'] },
  { emoji: '🌋', keywords: ['volcano', 'eruption', 'lava', 'hot', 'mountain', 'fire'] },
  { emoji: '❄️', keywords: ['snowflake', 'cold', 'winter', 'snow', 'ice', 'frozen'] },
  { emoji: '☃️', keywords: ['snowman', 'winter', 'cold', 'snow', 'christmas', 'fun'] },
  { emoji: '⛄', keywords: ['snowman', 'winter', 'cold', 'snow', 'christmas', 'carrot'] },
  { emoji: '🌨️', keywords: ['snowing', 'snow', 'winter', 'cold', 'weather', 'blizzard'] },
  
  // Food and drinks
  { emoji: '🍕', keywords: ['pizza', 'food', 'delicious', 'yummy', 'italian'] },
  { emoji: '☕', keywords: ['coffee', 'drink', 'morning', 'caffeine', 'energy'] },
  { emoji: '🍔', keywords: ['burger', 'hamburger', 'food', 'fast food', 'hungry'] },
  { emoji: '🍰', keywords: ['cake', 'birthday', 'dessert', 'sweet', 'celebration'] },
  { emoji: '🍎', keywords: ['apple', 'fruit', 'healthy', 'red', 'fresh'] },
  { emoji: '🍌', keywords: ['banana', 'fruit', 'yellow', 'healthy', 'potassium'] },
  { emoji: '🍓', keywords: ['strawberry', 'fruit', 'sweet', 'red', 'berry'] },
  { emoji: '🍉', keywords: ['watermelon', 'fruit', 'summer', 'juicy', 'refreshing'] },
  { emoji: '🍪', keywords: ['cookie', 'sweet', 'dessert', 'treat', 'yummy'] },
  { emoji: '🍫', keywords: ['chocolate', 'sweet', 'dessert', 'treat', 'brown'] },
  { emoji: '🍦', keywords: ['ice cream', 'cold', 'sweet', 'dessert', 'summer'] },
  { emoji: '🍷', keywords: ['wine', 'drink', 'alcohol', 'red', 'celebration'] },
  { emoji: '🍺', keywords: ['beer', 'drink', 'alcohol', 'cheers', 'party'] },
  { emoji: '🍻', keywords: ['beers', 'cheers', 'toast', 'party', 'celebration', 'drinks'] },
  { emoji: '🍾', keywords: ['champagne', 'celebration', 'cork', 'party', 'toast', 'fancy'] },
  { emoji: '🥂', keywords: ['champagne glasses', 'toast', 'cheers', 'celebration', 'clinking'] },
  { emoji: '🍜', keywords: ['ramen', 'soup', 'noodles', 'japanese', 'hot', 'bowl'] },
  { emoji: '🍝', keywords: ['pasta', 'spaghetti', 'italian', 'noodles', 'food'] },
  { emoji: '🍙', keywords: ['rice ball', 'onigiri', 'japanese', 'food', 'snack'] },
  { emoji: '🍚', keywords: ['rice', 'bowl', 'white rice', 'asian', 'food'] },
  { emoji: '🍛', keywords: ['curry', 'rice', 'indian', 'spicy', 'food'] },
  { emoji: '🍣', keywords: ['sushi', 'japanese', 'fish', 'raw', 'food', 'roll'] },
  { emoji: '🍧', keywords: ['shaved ice', 'snow cone', 'cold', 'dessert', 'summer', 'ice'] },
  
  // Activities and objects
  { emoji: '🎵', keywords: ['music', 'song', 'melody', 'tune', 'sound'] },
  { emoji: '🎮', keywords: ['video game', 'gaming', 'controller', 'play', 'fun'] },
  { emoji: '⚽', keywords: ['soccer', 'football', 'sport', 'ball', 'game'] },
  { emoji: '🏀', keywords: ['basketball', 'sport', 'ball', 'game', 'orange'] },
  { emoji: '🏒', keywords: ['hockey', 'ice hockey', 'sport', 'stick', 'game', 'ice'] },
  { emoji: '🏈', keywords: ['american football', 'football', 'sport', 'nfl', 'game'] },
  { emoji: '🏂', keywords: ['snowboard', 'winter sport', 'snow', 'skiing', 'extreme'] },
  { emoji: '⛷️', keywords: ['skiing', 'winter sport', 'snow', 'alpine', 'downhill'] },
  { emoji: '🎿', keywords: ['ski', 'winter sport', 'snow', 'equipment', 'alpine'] },
  { emoji: '🎸', keywords: ['guitar', 'music', 'rock', 'instrument', 'play'] },
  { emoji: '📱', keywords: ['phone', 'mobile', 'smartphone', 'call', 'text'] },
  { emoji: '💻', keywords: ['laptop', 'computer', 'work', 'tech', 'coding'] },
  { emoji: '📚', keywords: ['books', 'reading', 'study', 'education', 'knowledge'] },
  { emoji: '✈️', keywords: ['airplane', 'travel', 'flight', 'vacation', 'trip'] },
  { emoji: '🚗', keywords: ['car', 'drive', 'transport', 'vehicle', 'road'] },
  { emoji: '🚙', keywords: ['suv', 'car', 'drive', 'transport', 'vehicle', 'big'] },
  { emoji: '🚠', keywords: ['cable car', 'mountain', 'transport', 'ski lift', 'gondola'] },
  { emoji: '🚞', keywords: ['mountain railway', 'train', 'transport', 'mountain', 'scenic'] },
  { emoji: '🏠', keywords: ['house', 'home', 'building', 'family', 'cozy'] },
  { emoji: '🏰', keywords: ['castle', 'medieval', 'fortress', 'fairy tale', 'royal'] },
  { emoji: '🏯', keywords: ['japanese castle', 'pagoda', 'temple', 'architecture', 'japan'] },
  { emoji: '🏕️', keywords: ['camping', 'tent', 'outdoors', 'nature', 'adventure'] },
  { emoji: '⛺', keywords: ['tent', 'camping', 'outdoors', 'sleep', 'adventure'] },
  { emoji: '🎁', keywords: ['gift', 'present', 'surprise', 'birthday', 'wrapped'] },
  { emoji: '👑', keywords: ['crown', 'king', 'queen', 'royal', 'royalty', 'leader'] },
  { emoji: '💰', keywords: ['money', 'cash', 'wealth', 'rich', 'dollar'] },
  { emoji: '💎', keywords: ['diamond', 'gem', 'valuable', 'precious', 'sparkle'] },
  { emoji: '🔑', keywords: ['key', 'unlock', 'access', 'important', 'secret'] },
  { emoji: '🪓', keywords: ['axe', 'chop', 'wood', 'tool', 'lumberjack', 'cut'] },
  { emoji: '⚔️', keywords: ['sword', 'fight', 'battle', 'weapon', 'medieval', 'war'] },
  { emoji: '🛡️', keywords: ['shield', 'protection', 'defense', 'guard', 'medieval'] },
  { emoji: '🥾', keywords: ['hiking boot', 'boot', 'hiking', 'outdoors', 'adventure'] },
  { emoji: '⏰', keywords: ['alarm', 'time', 'clock', 'wake up', 'schedule'] },
  { emoji: '🎪', keywords: ['circus', 'fun', 'entertainment', 'show', 'carnival'] },
  { emoji: '🎭', keywords: ['theater', 'drama', 'masks', 'performance', 'art'] },
  { emoji: '🏃', keywords: ['running', 'exercise', 'fast', 'fitness', 'sport'] },
  
  // Other useful ones
  { emoji: '👀', keywords: ['eyes', 'look', 'see', 'watch', 'observe', 'attention'] },
  { emoji: '💤', keywords: ['sleep', 'zzz', 'tired', 'nap', 'rest', 'sleepy'] },
  { emoji: '💭', keywords: ['thought', 'bubble', 'thinking', 'idea', 'dream'] },
  { emoji: '💬', keywords: ['speech', 'talk', 'chat', 'conversation', 'message'] },
  { emoji: '📝', keywords: ['memo', 'note', 'write', 'list', 'document'] },
  { emoji: '✅', keywords: ['check', 'done', 'complete', 'yes', 'correct', 'success'] },
  { emoji: '❌', keywords: ['x', 'no', 'wrong', 'cancel', 'delete', 'error'] },
  { emoji: '⚠️', keywords: ['warning', 'caution', 'alert', 'danger', 'attention'] },
  { emoji: '🆕', keywords: ['new', 'fresh', 'recent', 'latest', 'updated'] },
  { emoji: '🔴', keywords: ['red', 'circle', 'stop', 'live', 'record'] },
  { emoji: '🟢', keywords: ['green', 'circle', 'go', 'good', 'success'] },
  { emoji: '🟡', keywords: ['yellow', 'circle', 'caution', 'warning', 'bright'] },
  { emoji: '💩', keywords: ['poop', 'shit', 'crap', 'funny', 'bad', 'stinky'] },
]

export const EmojiPicker = ({ onEmojiSelect, onClose }: EmojiPickerProps) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [position, setPosition] = useState<'top' | 'bottom'>('bottom')
  const pickerRef = useRef<HTMLDivElement>(null)

  // Filter emojis based on search term
  const filteredEmojis = EMOJI_DATA.filter(item => {
    if (!searchTerm.trim()) return true
    
    const term = searchTerm.toLowerCase()
    return item.keywords.some(keyword => keyword.includes(term)) ||
           item.emoji.includes(term)
  })

  // Determine optimal position based on available space
  useEffect(() => {
    if (pickerRef.current) {
      const rect = pickerRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const spaceBelow = viewportHeight - rect.top
      const spaceAbove = rect.top
      
      // Picker height is roughly 200px, so we need at least that much space
      if (spaceBelow < 200 && spaceAbove > 200) {
        setPosition('top')
      } else {
        setPosition('bottom')
      }
    }
  }, [])

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji)
    onClose()
  }

  const handleCustomEmojiSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      // If it looks like they typed an emoji directly, use it
      onEmojiSelect(searchTerm.trim())
      onClose()
    }
  }

  const positionClasses = position === 'top' 
    ? 'bottom-full mb-2' 
    : 'top-full mt-2'

  return (
    <div 
      ref={pickerRef}
      className={`absolute ${positionClasses} left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50 min-w-[280px]`}
    >
      {/* Search input */}
      <div className="mb-3">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search emojis... (try 'love', 'happy', 'fire')"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
          autoFocus
        />
      </div>

      {/* Filtered emojis grid */}
      <div className="grid grid-cols-8 gap-1 mb-3 max-h-32 overflow-y-auto">
        {filteredEmojis.map((item) => (
          <button
            key={item.emoji}
            onClick={() => handleEmojiClick(item.emoji)}
            className="w-8 h-8 text-lg hover:bg-gray-100 rounded flex items-center justify-center transition-colors"
            title={`${item.emoji} - ${item.keywords.slice(0, 3).join(', ')}`}
          >
            {item.emoji}
          </button>
        ))}
      </div>

      {/* No results message */}
      {searchTerm.trim() && filteredEmojis.length === 0 && (
        <div className="text-center py-4 text-gray-500 text-sm">
          <p>No emojis found for "{searchTerm}"</p>
          <p className="mt-1">You can still use it as a custom reaction!</p>
        </div>
      )}

      {/* Custom emoji submit */}
      {searchTerm.trim() && (
        <div className="border-t border-gray-200 pt-3">
          <form onSubmit={handleCustomEmojiSubmit} className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 flex-1">
              Use "{searchTerm}" as reaction?
            </span>
            <button
              type="submit"
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Use
            </button>
          </form>
        </div>
      )}

      {/* Help text */}
      {!searchTerm.trim() && (
        <div className="border-t border-gray-200 pt-3">
          <p className="text-xs text-gray-500">
            Search for emojis by keyword or type any emoji/text!
          </p>
        </div>
      )}

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-1 right-1 text-gray-400 hover:text-gray-600 w-6 h-6 flex items-center justify-center"
        title="Close"
      >
        ×
      </button>
    </div>
  )
}
