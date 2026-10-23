import { describe, expect, it } from 'vitest';
import { CATEGORIAS, elegirPreguntas, opcionesBarajadas, PREGUNTAS, preguntasFiltradas } from '../src/content/quiz';
import { DIFICULTADES, MODOS, nombreDificultad } from '../src/core/difficulty';
import { calcularPuntos, crearPartida, esIlimitada, preguntaActual, tiempoPregunta, type Partida } from '../src/core/partida';
import { randInt, rngFrom, shuffle } from '../src/core/rng';
import { agregarPuntuacion, CLAVE_GUARDADO, cargar, guardadoNuevo, guardar, limpiarNombre, normalizarGuardado, type Puntuacion } from '../src/storage';

describe('banco de preguntas', () => {
  it('cada pregunta está bien formada', () => {
    const ids = new Set<number>();
    for (const p of PREGUNTAS) {
      expect(ids.has(p.id), `id repetido ${p.id}`).toBe(false);
      ids.add(p.id);
      expect(p.pregunta.trim().length).toBeGreaterThan(5);
      expect(p.opciones.length).toBeGreaterThanOrEqual(2);
      expect(p.correcta).toBeGreaterThanOrEqual(0);
      expect(p.correcta).toBeLessThan(p.opciones.length);
      expect(new Set(p.opciones.map((o) => o.trim().toLowerCase())).size, `opciones repetidas en ${p.id}`).toBe(p.opciones.length);
      for (const o of p.opciones) expect(o.trim().length).toBeGreaterThan(0);
      expect(CATEGORIAS as readonly string[]).toContain(p.categoria);
      expect(['facil', 'media', 'dificil']).toContain(p.dificultad);
    }
  });

  it('hay preguntas suficientes en cada categoría y dificultad', () => {
    for (const c of CATEGORIAS) {
      for (const d of ['facil', 'media', 'dificil'] as const) expect(preguntasFiltradas(c, d).length, `${c}/${d}`).toBeGreaterThanOrEqual(10);
      expect(preguntasFiltradas(c, 'mixta').length).toBeGreaterThanOrEqual(30);
    }
    expect(preguntasFiltradas('Todas', 'mixta')).toHaveLength(PREGUNTAS.length);
  });

  it('la opción correcta no está siempre en el mismo sitio al barajar', () => {
    const p = PREGUNTAS[0];
    const posiciones = new Set<number>();
    for (let i = 0; i < 30; i++) {
      const ops = opcionesBarajadas(p, rngFrom(`s${i}`));
      expect(ops.filter((o) => o.correcta)).toHaveLength(1);
      expect(ops.find((o) => o.correcta)!.texto).toBe(p.opciones[p.correcta]);
      posiciones.add(ops.findIndex((o) => o.correcta));
    }
    expect(posiciones.size).toBeGreaterThan(1);
  });
});

describe('elegir preguntas', () => {
  it('elige la cantidad pedida, sin repetir, de la categoría y dificultad', () => {
    const lista = elegirPreguntas('Personajes', 'facil', 10, 'semilla');
    expect(lista).toHaveLength(10);
    expect(new Set(lista.map((p) => p.id)).size).toBe(10);
    for (const p of lista) {
      expect(p.categoria).toBe('Personajes');
      expect(p.dificultad).toBe('facil');
    }
  });

  it('la misma semilla da las mismas preguntas y otra semilla, otras', () => {
    const a = elegirPreguntas('Todas', 'mixta', 15, 'x').map((p) => p.id);
    const b = elegirPreguntas('Todas', 'mixta', 15, 'x').map((p) => p.id);
    const c = elegirPreguntas('Todas', 'mixta', 15, 'y').map((p) => p.id);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('si faltan, completa primero con la misma categoría', () => {
    const lista = elegirPreguntas('Números y Datos', 'facil', 20, 'z');
    expect(lista).toHaveLength(20);
    expect(new Set(lista.map((p) => p.id)).size).toBe(20);
    for (const p of lista) expect(p.categoria).toBe('Números y Datos');
  });
});

describe('partida', () => {
  it('partida normal: preguntas, tiempo y puntos con bonus', () => {
    const p = crearPartida({ categoria: 'Todas', dificultad: 'media', cantidad: 10 });
    expect(p.preguntas).toHaveLength(10);
    expect(esIlimitada(p)).toBe(false);
    expect(preguntaActual(p)).toBe(p.preguntas[0]);
    expect(tiempoPregunta(p)).toBe(MODOS.media.tiempo);
    expect(calcularPuntos(p, MODOS.media.tiempo)).toBe(MODOS.media.puntosBase + 10);
    expect(calcularPuntos(p, 0)).toBe(MODOS.media.puntosBase);
    expect(calcularPuntos(p, -5)).toBe(MODOS.media.puntosBase);
  });

  it('dificultad mixta usa el tiempo de cada pregunta', () => {
    const p = crearPartida({ categoria: 'Todas', dificultad: 'mixta', cantidad: 20 });
    for (let i = 0; i < p.preguntas.length; i++) {
      p.indice = i;
      expect(tiempoPregunta(p)).toBe(MODOS[p.preguntas[i].dificultad].tiempo);
    }
  });

  it('modo ilimitado: recicla el banco barajado en cada ronda', () => {
    const p: Partida = crearPartida({ categoria: 'Parábolas y Enseñanzas', dificultad: 'facil', cantidad: 'ilimitada' });
    expect(esIlimitada(p)).toBe(true);
    const total = p.preguntas.length;
    expect(total).toBe(preguntasFiltradas('Parábolas y Enseñanzas', 'facil').length);
    const ronda = (r: number) => Array.from({ length: total }, (_, i) => {
      p.indice = r * total + i;
      return preguntaActual(p).id;
    });
    const r0 = ronda(0);
    const r1 = ronda(1);
    expect(new Set(r1).size).toBe(total);
    expect([...r1].sort()).toEqual([...r0].sort());
    expect(ronda(1)).toEqual(r1);
  });

  it('dificultades y nombres', () => {
    expect(DIFICULTADES).toEqual(['facil', 'media', 'dificil', 'mixta']);
    expect(nombreDificultad('mixta')).toBe('Mixta');
    expect(nombreDificultad('dificil')).toBe('Difícil');
    expect(MODOS.facil.tiempo).toBeGreaterThan(MODOS.dificil.tiempo);
    expect(MODOS.facil.puntosBase).toBeLessThan(MODOS.dificil.puntosBase);
  });
});

describe('aleatorio', () => {
  it('rng determinista y barajado sin perder elementos', () => {
    const a = rngFrom('hola');
    const b = rngFrom('hola');
    for (let i = 0; i < 20; i++) expect(a()).toBe(b());
    const lista = Array.from({ length: 50 }, (_, i) => i);
    const barajada = shuffle(rngFrom('x'), lista);
    expect(barajada).not.toEqual(lista);
    expect([...barajada].sort((x, y) => x - y)).toEqual(lista);
    expect(lista[0]).toBe(0);
    const r = rngFrom('dado');
    for (let i = 0; i < 200; i++) {
      const n = randInt(r, 1, 6);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(6);
    }
  });
});

describe('guardado', () => {
  const punt = (nombre: string, puntaje: number): Puntuacion => ({ nombre, puntaje, aciertos: 5, total: 10, dificultad: 'facil', categoria: 'Todas', fecha: '2026-10-22' });

  it('normaliza datos dañados', () => {
    expect(normalizarGuardado(null)).toEqual(guardadoNuevo());
    const g = normalizarGuardado({ nombre: '  Ana   María ', puntuaciones: [punt('A', 10), { nombre: 3 }, 'x'], config: { sonido: 'sí', tema: 'rosa', pantallaCompleta: false } });
    expect(g.nombre).toBe('Ana María');
    expect(g.puntuaciones).toHaveLength(1);
    expect(g.config).toEqual({ sonido: true, tema: 'auto', pantallaCompleta: false });
  });

  it('nombres válidos y no válidos', () => {
    expect(limpiarNombre('José Ñúñez')).toBe('José Ñúñez');
    expect(limpiarNombre("O'Brien-Smith")).toBe("O'Brien-Smith");
    expect(limpiarNombre('   ')).toBeNull();
    expect(limpiarNombre('<script>')).toBeNull();
    expect(limpiarNombre('a'.repeat(30))).toBe('a'.repeat(20));
  });

  it('las puntuaciones se ordenan y se limitan a 20', () => {
    const g = guardadoNuevo();
    for (let i = 0; i < 25; i++) agregarPuntuacion(g, punt(`J${i}`, i * 10));
    expect(g.puntuaciones).toHaveLength(20);
    expect(g.puntuaciones[0].puntaje).toBe(240);
    expect(g.puntuaciones.at(-1)!.puntaje).toBe(50);
  });

  it('guardar y cargar (y sobrevivir sin almacenamiento o con datos rotos)', () => {
    const datos = new Map<string, string>();
    const almacen = { getItem: (k: string) => datos.get(k) ?? null, setItem: (k: string, v: string) => void datos.set(k, v) };
    const g = guardadoNuevo();
    g.nombre = 'Ana';
    agregarPuntuacion(g, punt('Ana', 90));
    guardar(g, almacen);
    expect(datos.has(CLAVE_GUARDADO)).toBe(true);
    expect(cargar(almacen)).toEqual(g);
    datos.set(CLAVE_GUARDADO, '{roto');
    expect(cargar(almacen)).toEqual(guardadoNuevo());
    expect(cargar(null)).toEqual(guardadoNuevo());
    expect(() => guardar(g, { setItem: () => { throw new Error('lleno'); } })).not.toThrow();
  });
});
