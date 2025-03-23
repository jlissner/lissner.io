export function StyleGuide() {
  return (
    <div>
      <h2>Colors</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(8, minmax(10px, 100px))",
          gridTemplateRows: "repeat(4, 100px)",
        }}
      >
        <div className="bg-bg">bg</div>
        <div className="bg-red">red</div>
        <div className="bg-green">green</div>
        <div className="bg-yellow">yellow</div>
        <div className="bg-blue">blue</div>
        <div className="bg-purple">purple</div>
        <div className="bg-aqua">aqua</div>
        <div className="bg-gray-alt">gray-alt</div>
        <div className="bg-gray">gray</div>
        <div className="bg-red-alt">red-alt</div>
        <div className="bg-green-alt">green-alt</div>
        <div className="bg-yellow-alt">yellow-alt</div>
        <div className="bg-blue-alt">blue-alt</div>
        <div className="bg-purple-alt">purple-alt</div>
        <div className="bg-aqua-alt">aqua-alt</div>
        <div className="bg-fg c-text-inverse">fg</div>
        <div className="bg-text c-text-inverse">text</div>
        <div className="bg-bg">bg</div>
        <div className="bg-bg1">bg1</div>
        <div className="bg-bg2">bg2</div>
        <div className="bg-bg3">bg3</div>
        <div className="bg-bg4">bg4</div>
        <div className="bg-grey">grey</div>
        <div className="bg-orange">orange</div>
        <div></div>
        <div className="bg-bg0_s">bg0_s</div>
        <div className="bg-fg4">fg4</div>
        <div className="bg-fg3 c-text-inverse">fg3</div>
        <div className="bg-fg2 c-text-inverse">fg2</div>
        <div className="bg-fg1 c-text-inverse">fg1</div>
        <div className="bg-fg0 c-text-inverse">fg0</div>
        <div className="bg-orange-alt">orange-alt</div>
      </div>
    </div>
  );
}
