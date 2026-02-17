export type OPFSFileName = string;

const rootDirectoryPromise = navigator.storage?.getDirectory?.();

async function getFileHandle(name: OPFSFileName, options?: FileSystemGetFileOptions) {
    const root = await rootDirectoryPromise;
    return root.getFileHandle(name, options);
}

async function readOPFile(fileName: OPFSFileName, url: string) {
    const originLoad = async () => {
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`Font fetch failed: ${url} (${res.status})`);
        }
        const buffer = await res.arrayBuffer();
        await opfs.write(fileName, buffer);
        return buffer;
    };
    if (!rootDirectoryPromise) {
        return await originLoad();
    }
    try {
        const fileHandle = await getFileHandle(fileName);
        const file = await fileHandle.getFile();
        return await file.arrayBuffer();
    } catch (error) {
        return await originLoad();
    }
}

async function writeOPFile(name: OPFSFileName, buffer: any) {
    if (!rootDirectoryPromise) {
        return;
    }
    try {
        const fileHandle = await getFileHandle(name, { create: true });
        const writable = await (fileHandle as any).createWritable();
        await writable.write(buffer);
        await writable.close();
    } catch (error) {

    }
}

export const opfs = {
    read: readOPFile,
    write: writeOPFile
};