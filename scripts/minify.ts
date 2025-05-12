import esbuild from "esbuild";
import { lstatSync, readdirSync } from "fs";

async function buildFile(path: string) {
    const slashIndex = path.lastIndexOf('/');
    const directory = path.slice(0, slashIndex);
    const file = path.slice(slashIndex + 1);
    const dotIndex = file.lastIndexOf('.');
    const name = file.slice(0, dotIndex);
    const extension = file.slice(dotIndex + 1);
    if (!name.endsWith('.min')) {
        const outfile = `${directory}/${name}.min.${extension}`;
        if (['js', 'css'].includes(extension)) {
            await esbuild.build({
                entryPoints: [path],
                outfile,
                minify: true,
                sourcemap: true,
                bundle: false,
                loader: {
                    '.js': 'js',
                    '.css': 'css'
                },
            });
        }
    }
}

async function buildDirectory(path: string) {
    const dir = readdirSync(path);
    for (const file of dir) {
        await build(`${path}/${file}`);
    }
}

async function build(path: string) {
    const stat = lstatSync(path);
    if (stat.isDirectory()) {
        await buildDirectory(path);
    } else if (stat.isFile()) {
        await buildFile(path);
    }
}

build("./public");