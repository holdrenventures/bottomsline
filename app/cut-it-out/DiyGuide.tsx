import { MuscleDiagram, DropArmDiagram, CropDiagram } from './CutDiagrams';

// The static how-to guide. Copy lifted from the artifact and adapted to the
// Bottom’s Line voice/typography. The interactive part lives in the modeler
// above; this section is the reference material.

const kit = [
  'Sharp fabric scissors (not the kitchen pair) or a rotary cutter and mat',
  'Fabric chalk, a sliver of bar soap, or a washable marker',
  'A ruler or tape measure',
  'A tee that already fits you across the shoulders',
  'A piece of cardboard for front-only cuts',
];

const rules = [
  ['Wash and dry it first.', 'Cotton shrinks. Let it shrink before you cut, not after.'],
  ['Lay it flat', 'on a hard surface and smooth every wrinkle.'],
  ['Fold it in half lengthwise,', 'sleeves stacked, so both sides come out even.'],
  ['Cut less than you think.', 'You can always take more off. You can’t glue it back.'],
  ['Long, smooth strokes.', 'Short choppy snips leave a jagged edge.'],
  ['Don’t worry about fraying.', 'Jersey knit doesn’t fray. It curls, and that’s the look.'],
  ['This is DIY.', 'We ship the shirt. You bring the scissors. If your cut goes sideways, make it work — we don’t replace shirts you’ve already rearranged.'],
];

type LessonId = 'muscle' | 'drop-arm' | 'crop';
const lessons: Array<{
  id: LessonId;
  number: string;
  eyebrow: string;
  title: string;
  tag: string;
  specs: string[];
  steps: Array<[string, string]>;
  tip: [string, string];
}> = [
  {
    id: 'muscle',
    number: '01',
    eyebrow: 'The starter',
    title: 'Muscle Tee',
    tag: 'Arms out. The easiest cut in the book.',
    specs: ['5 min', 'Easy', 'Gym · brunch · everyday'],
    steps: [
      ['Fold the tee in half lengthwise', 'so the sleeves stack on top of each other.'],
      ['Find the seam', 'where the sleeve joins the body.'],
      ['Cut along the sleeve side of that seam,', 'keeping the stitching on the body. That stitched edge keeps the armhole from stretching out.'],
      ['Want more room?', 'Take the underarm down 1 in, curving back up to meet the seam at the shoulder.'],
      ['Unfold, try it on,', 'then stretch any raw edges so they roll.'],
    ],
    tip: ['Pro move', 'Cut the sleeves off a size-up tee for a looser, boxier muscle tank that hangs lower on the sides.'],
  },
  {
    id: 'drop-arm',
    number: '02',
    eyebrow: 'The statement',
    title: 'Drop-Arm Tank',
    tag: 'Side body, meet sunlight.',
    specs: ['10 min', 'Medium', 'Pride · gym · beach'],
    steps: [
      ['Mark your depth on you.', 'Put the shirt on and chalk a dot on the side seam where you want the armhole to end. Use the modeler slider as a starting point.'],
      ['Lay it flat and fold it in half', 'lengthwise, sleeves stacked.'],
      ['Mark your strap', 'on the shoulder seam, 2 to 3 in out from the collar. Keep at least 2 in of shoulder so it stays put.'],
      ['Draw a J-curve', 'from the strap mark down to your depth mark. Curve in toward the chest first, then sweep out to the side seam.'],
      ['Cut through all layers', 'along the curve.'],
      ['Try it on.', 'Want more? Go deeper in 0.5 in passes.'],
    ],
    tip: ['Pro move', 'Past 6 in you’re in stringer territory. Keep the strap at least 1.5 in wide or it will roll into a string after the first wash.'],
  },
  {
    id: 'crop',
    number: '03',
    eyebrow: 'The showoff',
    title: 'Crop Top',
    tag: 'A little stomach never hurt anybody.',
    specs: ['5 min', 'Easy', 'Festivals · summer · going out'],
    steps: [
      ['Mark it on you with your arms up.', 'Put the shirt on, raise your arms overhead, and chalk where you want the hem to land. Hems ride up when you move.'],
      ['Add 1 in below that mark.', 'The raw edge rolls up about 0.5 in after a wash.'],
      ['Lay it flat', 'with the side seams lined up and chalk a straight line across with a ruler.'],
      ['Cut through both layers', 'in long, even strokes.'],
      ['Stretch the new hem', 'all the way around so it rolls clean.'],
    ],
    tip: ['Check the print', 'Look at where the design ends before you mark the hem. A crop through the art ruins it. Tall prints work better as a muscle tee or drop arm.'],
  },
];

const extrasCards = [
  ['Scoop Neck', 'Cut the ribbed collar off just under its stitching. For deeper, mark 2 to 3 in below the front neckline and curve up to each shoulder seam. Front layer only, cardboard inside.'],
  ['V-Neck', 'Remove the collar band first. Fold the front in half, mark 3 to 4 in below the neckline at center, and cut straight lines from each shoulder corner down to the mark.'],
  ['Side Slits', 'Cut 2 to 4 in straight up each side seam from the hem. Cut beside the seam, not through it, so the stitching stops it from running.'],
  ['Back Slashes', 'Back only. Cut 6 to 8 horizontal slits, 1 in apart, stopping 2 in from each side. Pull each strip to stretch it open.'],
];

const combos = [
  ['Muscle + crop at 8 in', 'The Brunch', 'Cropped muscle tee. Shows a little, says a lot.'],
  ['Drop arm 6 in + crop at 7 in', 'The Full Send', 'Pride, circuit parties, anywhere it’s hot and loud.'],
  ['Muscle + scoop neck', 'The Easy Summer', 'Relaxed and breezy. Pairs with shorts and nowhere to be.'],
  ['Drop arm 4 in + side slits', 'The Beach Bum', 'Loose through the body, perfect over trunks.'],
];

export default function DiyGuide() {
  return (
    <>
      <section className="cut-panels shell section">
        <article className="cut-panel">
          <p className="eyebrow"><span /> Before you cut</p>
          <h2>The kit</h2>
          <ul>{kit.map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
        <article className="cut-panel">
          <p className="eyebrow"><span /> House rules</p>
          <h2>Read these once</h2>
          <ul>{rules.map(([lead, rest]) => <li key={lead}><strong>{lead}</strong> {rest}</li>)}</ul>
        </article>
      </section>

      <section className="cut-lessons shell">
        {lessons.map((lesson) => (
          <article key={lesson.id} id={`how-to-${lesson.id}`} className="cut-lesson">
            <div className="cut-lesson__head">
              <p className="eyebrow"><span /> Cut {lesson.number} · {lesson.eyebrow}</p>
              <h2>{lesson.title}</h2>
              <p>{lesson.tag}</p>
            </div>
            <div className="cut-lesson__body">
              <figure className="cut-lesson__figure">
                {lesson.id === 'muscle' && <MuscleDiagram />}
                {lesson.id === 'drop-arm' && <DropArmDiagram depth={4} />}
                {lesson.id === 'crop' && <CropDiagram hem={8} />}
                <figcaption>
                  <span className="cut-diagram__legend"><i /> Cut line</span>
                  <span className="cut-diagram__legend"><i className="ghost" /> Original shirt</span>
                </figcaption>
              </figure>
              <div className="cut-lesson__copy">
                <ul className="cut-lesson__specs">
                  {lesson.specs.map((spec) => <li key={spec}>{spec}</li>)}
                </ul>
                <ol className="cut-lesson__steps">
                  {lesson.steps.map(([lead, rest], index) => (
                    <li key={index}>
                      <span className="cut-lesson__num">{String(index + 1).padStart(2, '0')}</span>
                      <p><strong>{lead}</strong> {rest}</p>
                    </li>
                  ))}
                </ol>
                <aside className="cut-lesson__tip">
                  <p className="eyebrow">{lesson.tip[0]}</p>
                  <p>{lesson.tip[1]}</p>
                </aside>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="cut-extras-list shell section">
        <div className="section-heading">
          <div>
            <p className="eyebrow"><span /> Finishing moves</p>
            <h2>The<br /><em>extras.</em></h2>
          </div>
          <p>Stack these on any cut above.</p>
        </div>
        <div className="cut-extras-grid">
          {extrasCards.map(([title, body]) => (
            <article key={title} className="cut-extra-card">
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cut-combos shell section">
        <div className="section-heading">
          <div>
            <p className="eyebrow"><span /> Mix and match</p>
            <h2>House<br /><em>combos.</em></h2>
          </div>
          <p>Do the cuts in this order: sleeves, then neck, then hem.</p>
        </div>
        <div className="cut-combo-grid">
          {combos.map(([recipe, title, note]) => (
            <article key={title} className="cut-combo">
              <span className="cut-combo__recipe">{recipe}</span>
              <h3>{title}</h3>
              <p>{note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cut-panels cut-panels--finish shell section">
        <article className="cut-panel">
          <p className="eyebrow"><span /> Last step</p>
          <h2>Roll the edges</h2>
          <ul>
            <li>Grab each raw edge in both hands and pull firmly every few inches.</li>
            <li>The jersey curls into a soft, clean roll. That’s your finished edge.</li>
            <li>Trim any loose threads flush where you cut near a seam.</li>
          </ul>
        </article>
        <article className="cut-panel">
          <p className="eyebrow"><span /> Care</p>
          <h2>Keep it looking good</h2>
          <ul>
            <li>Wash cold, inside out.</li>
            <li>Tumble dry low once to set the curl, then hang dry after that.</li>
            <li>Skip the iron on cut edges. It flattens the roll.</li>
          </ul>
        </article>
      </section>
    </>
  );
}
