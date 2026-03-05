const shapes = [
  { emoji: '⭐', size: 'text-4xl', pos: 'top-[10%] left-[5%]', delay: '' },
  { emoji: '🎯', size: 'text-3xl', pos: 'top-[20%] right-[10%]', delay: 'animate-float-delayed' },
  { emoji: '🏆', size: 'text-5xl', pos: 'bottom-[15%] left-[8%]', delay: 'animate-float-slow' },
  { emoji: '🎉', size: 'text-3xl', pos: 'top-[60%] right-[5%]', delay: '' },
  { emoji: '💡', size: 'text-4xl', pos: 'bottom-[30%] right-[15%]', delay: 'animate-float-delayed' },
  { emoji: '🚀', size: 'text-3xl', pos: 'top-[40%] left-[3%]', delay: 'animate-float-slow' },
  { emoji: '🎮', size: 'text-2xl', pos: 'top-[5%] left-[40%]', delay: '' },
  { emoji: '🧠', size: 'text-2xl', pos: 'bottom-[5%] right-[40%]', delay: 'animate-float-delayed' },
];

export default function FloatingShapes() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {shapes.map((shape, i) => (
        <div
          key={i}
          className={`absolute ${shape.pos} ${shape.size} animate-float ${shape.delay} opacity-30`}
        >
          {shape.emoji}
        </div>
      ))}
    </div>
  );
}
