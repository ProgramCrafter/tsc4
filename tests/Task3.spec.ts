import { Blockchain, SandboxContract } from '@ton-community/sandbox';
import { Builder, Cell, beginCell, toNano } from 'ton-core';
import { Task3 } from '../wrappers/Task3';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import fs from 'fs'
import MersenneTwister from 'mersenne-twister'



function bitCount(n: bigint) {
    return n.toString(2).length;
}

describe('Task3', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Task3');
    });

    let blockchain: Blockchain;
    let task3: SandboxContract<Task3>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        blockchain.verbosity = {
            blockchainLogs: false,
            vmLogs: 'vm_logs_full',
            debugLogs: false,
            print: false,
        }


        task3 = blockchain.openContract(Task3.createFromConfig({}, code));

        const deployer = await blockchain.treasury('deployer');

        const deployResult = await task3.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: task3.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {

        for (let k = 0; k < 1; k++) {
            let inputStr: string = ''
            const generator = new MersenneTwister(k);
            for (let i = 0; i < 9000; i++) {
                inputStr += generator.random() > 0.5 ? '1' : '0'
            }
            const inputChunks = getChunks(inputStr as any, 1000)
            console.log('input chunks:', inputChunks)
            // const inputNum = BigInt('0b' +inputStr)
            const flag = '110010010001111'
            const value = '100101110010001011100'
            const goodValue = inputStr.replaceAll(flag, value)

            let fullCell: Builder | undefined

            for (let i = inputChunks.length - 1; i >= 0; i--) {
                // const num = BigInt('0b' + inputChunks[i])
                let newCell = beginCell()
                for (const x of inputChunks[i]) {
                    newCell.storeBit(x === '1')
                    // .storeUint(num, bitCount(num))
                }

                if (fullCell) {

                    newCell.storeRef(fullCell)
                }

                fullCell = newCell
            }
            // const outputStr = '0b10001'
            // const testCell = beginCell().storeUint(inputNum, bitCount(inputNum))
            //     // .storeUint(1, 255)
            //     // .storeUint(1, 255)
            //     // .storeUint(1, 255)
            //     // .storeRef(beginCell().storeUint(1, 255).storeUint(1, 255).endCell())
            //     .endCell()
            // const flag = 0b111
            // const value = 0b1
            // const goodValue = 0b10001
            // const goodCell = beginCell().storeUint(goodValue, 7).endCell()

            try {
                const res = await task3.getFind_and_replace(parseInt(flag, 2), parseInt(value, 2), fullCell!.asCell())
                fs.writeFileSync('vmlogs.log', res.logs as string)

                const resCell = res.stack.readCell()
                const resHash = resCell.hash()
                let result = ''
                let sl = resCell.asSlice()
                while (true) {
                    const total = sl.remainingBits
                    for (let i = 0; i < total; i++) {
                        result += sl.loadBit() ? '1' : '0'


                        // const bits = sl.loadBits(sl.remainingBits)
                        // for (const bit of bits)
                    }

                    if (sl.remainingRefs) {
                        console.log('read ref')
                        sl = sl.loadRef().asSlice()
                    } else {
                        break
                    }
                }
                // const resNmber = resCell.asSlice().loadUint(resCell.asSlice().remainingBits)
                console.log('input      :', inputStr)
                console.log('res number :', result)
                console.log('good number:', goodValue)
                console.log('pass?', result === goodValue)
                console.log('gas', res.gasUsed)

                expect(result.length).toBe(goodValue.length)
                expect(result).toBe(goodValue)
                // expect(resHash).toEqual(goodCell.hash())
                // console.log('?????', result)
            } catch (e: any) {
                fs.writeFileSync('vmlogs.log', e?.blockchainLogs as string || '')
                throw e
            }
        }
        // the check is done inside beforeEach
        // blockchain and task3 are ready to use
    });
});

export function getChunks<T>(input: T[], size: number): T[][] {
    if (input.length < size) {
        return [input]
    }

    const chunks: T[][] = []

    for (let i = 0; i < input.length; i += size) {
        const chunk = input.slice(i, i + size)
        chunks.push(chunk)
    }

    return chunks
}
