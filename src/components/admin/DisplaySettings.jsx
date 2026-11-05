import React, { useRef, useState } from 'react';
import { LAYOUT_PRESETS, DEFAULT_DISPLAY, displayGrid, splitHandles, splitValue } from '@/lib/displayLayout';
import { applyTheme, readTheme } from '@/lib/theme';

const TITLES = { order: 'Race order', live: 'Live results', epd: 'Estimated positions' };
export default function DisplaySettings({ value, onChange }) {
  const preview = useRef(null);
  const [theme, setTheme] = useState(readTheme);
  const change = patch => onChange({ ...value, ...patch });
  const drag = (event, handle) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    move(event, handle);
  };
  const move = (event, handle) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const rect = preview.current.getBoundingClientRect();
    const position = handle.axis === 'x' ? (event.clientX-rect.left)/rect.width*100 : (event.clientY-rect.top)/rect.height*100;
    change({ [handle.key]: splitValue(value, handle.key, position) });
  };
  return <section className="display-settings" aria-labelledby="display-settings-title">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="display-settings-title" className="font-display text-2xl uppercase">Display layout</h2>
      <button type="button" className="display-button" onClick={() => onChange(structuredClone(DEFAULT_DISPLAY))}>Reset display defaults</button>
    </div>
    <p className="mt-2 text-sm text-rd-muted">Choose a view, then drag the dividers or set rotation times. Save settings to apply it to every board. Narrow screens stack the panels.</p>
    <div className="layout-preset-options" role="group" aria-label="Layout presets">
      {LAYOUT_PRESETS.map(preset => <button type="button" key={preset.id} aria-pressed={value.preset === preset.id}
        className="layout-preset" onClick={() => change({ preset: preset.id, primary: preset.primary, secondary: preset.secondary })}>
        <span className="layout-miniature" style={displayGrid({ ...DEFAULT_DISPLAY, preset: preset.id, primary: preset.primary })} aria-hidden="true">
          {(preset.id === 'rotate' ? ['live'] : Object.keys(TITLES)).map(key => <span key={key} style={{gridArea:key}}>{key === 'order' ? 'R' : key === 'live' ? 'L' : 'E'}</span>)}
        </span>
        <strong>{preset.label}</strong><span>{preset.description}</span>
      </button>)}
    </div>
    <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
      <p className="text-sm text-rd-muted">Layout preview: drag a divider or use its arrow keys.</p>
      <button type="button" className="display-button" onClick={() => { const next = theme === 'dark' ? 'light' : 'dark'; setTheme(next); applyTheme(next); }}>Switch to {theme === 'dark' ? 'light' : 'dark'} mode</button>
    </div>
    <div ref={preview} className="layout-editor" style={displayGrid(value)}>
      {Object.entries(TITLES).filter(([key]) => value.preset !== 'rotate' || key === 'live').map(([key,title]) => <div key={key} className={`layout-preview-panel preview-${key}`} style={{gridArea:key, '--preview-font':value.fonts[key]/100}}>
        <h3>{title}</h3>
        {key === 'order' ? <div className="preview-race-cards">{[22,23,24,25].map((n,i)=><div key={n}><b>{n}</b><span>2WD Modified Buggy<br/><small>Heat {i+1}/4</small><br/><strong>{i?'18:27':'18:21'}</strong><small> in {i?'7:24':'1:38'}</small></span></div>)}</div>
          : <div className="preview-table"><div><span>Pos / Driver</span><span>{key === 'live' ? 'Last / Pace' : 'Projected'}</span></div>{['Paul Fisher','Daniel Roberts','Craig Jones','Ashley Smith'].map((name,i)=><div key={name}><span>{i+1} {name}</span><strong>{key === 'live' ? '18.234' : '17/5:02.1'}</strong></div>)}</div>}
      </div>)}
      {splitHandles(value).map(handle => <div key={handle.key} role="separator" tabIndex={0}
        aria-label={handle.key === 'primary' ? 'Main panel split' : 'Results panel split'} aria-orientation={handle.axis === 'x' ? 'vertical' : 'horizontal'}
        aria-valuemin={25} aria-valuemax={75} aria-valuenow={value[handle.key]}
        className={`layout-divider divider-${handle.axis}`}
        style={handle.axis === 'x' ? {left:`${handle.at}%`,top:`${handle.from}%`,height:`${handle.to-handle.from}%`} : {top:`${handle.at}%`,left:`${handle.from}%`,width:`${handle.to-handle.from}%`}}
        onPointerDown={event=>drag(event,handle)} onPointerMove={event=>move(event,handle)} onPointerUp={event=>{if(event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);}}
        onKeyDown={event=>{ if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)) return;
          event.preventDefault(); const delta=(event.key==='ArrowLeft'||event.key==='ArrowUp'?-1:1)*(event.shiftKey?5:1);
          const invert=handle.key==='primary'&&['bottom','right'].includes(value.preset)?-1:1;
          change({[handle.key]:event.key==='Home'?25:event.key==='End'?75:Math.max(25,Math.min(75,value[handle.key]+delta*invert))}); }}><span /></div>)}
    </div>
    <div className="display-adjustments">
      {(value.preset === 'rotate' ? [] : [['primary','Main split'],['secondary','Secondary split']]).map(([key,label])=><label key={key}>{label} <strong>{value[key]}%</strong>
        <input type="range" min="25" max="75" step="1" value={value[key]} onChange={event=>change({[key]:Number(event.target.value)})}/></label>)}
      {Object.entries(TITLES).map(([key,title])=><label key={key}>{title} font <strong>{value.fonts[key]}%</strong>
        <input type="range" min="50" max="150" step="5" value={value.fonts[key]} onChange={event=>change({fonts:{...value.fonts,[key]:Number(event.target.value)}})}/></label>)}
    </div>
    {value.preset === 'rotate' && <div className="rotation-settings"><h3 className="font-display text-xl uppercase">Full-screen rotation times</h3><p className="text-sm text-rd-muted">Live results, then estimated positions, then race order. The sequence repeats. Each screen starts on its first page.</p><div className="display-adjustments">{['live','epd','order'].map(key=><label key={key}>{TITLES[key]} (seconds)<input type="number" min="5" max="120" step="1" value={value.durations?.[key] ?? 15} onChange={event=>change({durations:{...DEFAULT_DISPLAY.durations,...value.durations,[key]:Number(event.target.value)}})}/></label>)}</div></div>}
    {value.preset !== 'rotate' && <label className="flex items-center gap-2 mt-4 text-sm"><input type="checkbox" checked={value.finalsExpand} onChange={event=>change({finalsExpand:event.target.checked})}/>In finals, expand live results into the estimated-positions space</label>}
    <p className="mt-3 text-xs text-rd-muted">100% keeps the current default font size. Larger text or smaller panels show fewer rows per page. Paging stays automatic in TV mode.</p>
  </section>;
}
