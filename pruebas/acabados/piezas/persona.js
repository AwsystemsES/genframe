// Persona genérica de prueba. p: {color, fusil}
return f.gen.human({style: 'real', jacket: p.color || '#4a6a8a', bottom: '#2f3640', hair: {style: 'corto', color: '#3a2a20'}, headwear: p.casco ? 'casco_obra' : 'ninguno', headwearColor: '#e2b23a', rifle: p.fusil || false});
