const run = require('.');
const core = require('@actions/core');
const tmp = require('tmp');
const fs = require('fs');

jest.mock('@actions/core');
jest.mock('tmp');
jest.mock('fs');

describe('Render task definition', () => {
    const OLD_ENV = process.env

    beforeEach(() => {
        jest.clearAllMocks();

        core.getInput = jest
            .fn()
            .mockReturnValueOnce('task-definition.json') // task-definition
            .mockReturnValueOnce('web')                  // container-name
            .mockReturnValueOnce('nginx:latest');        // image

        jest.resetModules();
        process.env = { ...OLD_ENV };
        process.env = Object.assign(process.env, { GITHUB_WORKSPACE: __dirname });
        process.env = Object.assign(process.env, { RUNNER_TEMP: '/tmp' });

        tmp.fileSync.mockReturnValue({
            name: 'new-task-def-file-name'
        });

        fs.existsSync.mockReturnValue(true);

        jest.mock('./task-definition.json', () => ({
            family: 'task-def-family',
            containerDefinitions: [
                {
                    name: "web",
                    image: "some-other-image"
                },
                {
                    name: "sidecar",
                    image: "hello"
                }
            ]
        }), { virtual: true });
    });

    test('renders the task definition and creates a new task def file', async () => {
        await run();
        expect(tmp.fileSync).toHaveBeenNthCalledWith(1, {
            dir: '/tmp',
            prefix: 'task-definition-',
            postfix: '.json',
            keep: true,
            discardDescriptor: true
          });
        expect(fs.writeFileSync).toHaveBeenNthCalledWith(1, 'new-task-def-file-name',
            JSON.stringify({
                family: 'task-def-family',
                containerDefinitions: [
                    {
                        name: "web",
                        image: "nginx:latest"
                    },
                    {
                        name: "sidecar",
                        image: "hello"
                    }
                ]
            }, null, 2)
        );
        expect(core.setOutput).toHaveBeenNthCalledWith(1, 'task-definition', 'new-task-def-file-name');
    });

    test('renders a task definition at an absolute path', async () => {
        core.getInput = jest
            .fn()
            .mockReturnValueOnce('/hello/task-definition.json') // task-definition
            .mockReturnValueOnce('web')                  // container-name
            .mockReturnValueOnce('nginx:latest');        // image
        jest.mock('/hello/task-definition.json', () => ({
            family: 'task-def-family',
            containerDefinitions: [
                {
                    name: "web",
                    image: "some-other-image"
                }
            ]
        }), { virtual: true });

        await run();

        expect(tmp.fileSync).toHaveBeenNthCalledWith(1, {
            dir: '/tmp',
            prefix: 'task-definition-',
            postfix: '.json',
            keep: true,
            discardDescriptor: true
          });
        expect(fs.writeFileSync).toHaveBeenNthCalledWith(1, 'new-task-def-file-name',
            JSON.stringify({
                family: 'task-def-family',
                containerDefinitions: [
                    {
                        name: "web",
                        image: "nginx:latest"
                    }
                ]
            }, null, 2)
        );
        expect(core.setOutput).toHaveBeenNthCalledWith(1, 'task-definition', 'new-task-def-file-name');
    });

    test('renders a task definiton with given environment variables', async () => {
        process.env = Object.assign(process.env, { TASK_APP_DEBUG: "false" });
        process.env = Object.assign(process.env, { GIHTUB_ACTIONS: "true" });

        core.getInput = jest
            .fn()
            .mockReturnValueOnce('task-definition.json') // task-definition
            .mockReturnValueOnce('web')                  // container-name
            .mockReturnValueOnce('nginx:latest')         // image
            .mockReturnValueOnce('TASK_');               // env-prefix

        await run();

        expect(tmp.fileSync).toHaveBeenNthCalledWith(1, {
            dir: '/tmp',
            prefix: 'task-definition-',
            postfix: '.json',
            keep: true,
            discardDescriptor: true
        });
        expect(fs.writeFileSync).toHaveBeenNthCalledWith(1, 'new-task-def-file-name',
            JSON.stringify({
                family: 'task-def-family',
                containerDefinitions: [
                    {
                        name: "web",
                        image: "nginx:latest",
                        environment: [
                            {
                                name: "APP_DEBUG",
                                value: "false"
                            }
                        ]
                    },
                    {
                        name: "sidecar",
                        image: "hello"
                    }
                ]
            }, null, 2)
        );
        expect(core.setOutput).toHaveBeenNthCalledWith(1, 'task-definition', 'new-task-def-file-name');
    })

    test('renders a task definiton with given port mapping', async () => {
        core.getInput = jest
            .fn()
            .mockReturnValueOnce('task-definition.json') // task-definition
            .mockReturnValueOnce('web')                  // container-name
            .mockReturnValueOnce('nginx:latest')         // image
            .mockReturnValueOnce('TASK_')                // env-prefix
            .mockReturnValueOnce('3000');          // portmapping

        await run();

        expect(tmp.fileSync).toHaveBeenNthCalledWith(1, {
            dir: '/tmp',
            prefix: 'task-definition-',
            postfix: '.json',
            keep: true,
            discardDescriptor: true
        });
        expect(fs.writeFileSync).toHaveBeenNthCalledWith(1, 'new-task-def-file-name',
            JSON.stringify({
                family: 'task-def-family',
                containerDefinitions: [
                    {
                        name: "web",
                        image: "nginx:latest",
                        portMappings: [
                            {
                                containerPort: "3000",
                                hostPort: "0",
                                protocol: "tcp"
                            }
                        ]
                    },
                    {
                      name: "sidecar",
                      image: "hello"
                  }
                ]
            }, null, 2)
        );
        expect(core.setOutput).toHaveBeenNthCalledWith(1, 'task-definition', 'new-task-def-file-name');
    })

    test('error returned for missing task definition file', async () => {
        fs.existsSync.mockReturnValue(false);
        core.getInput = jest
            .fn()
            .mockReturnValueOnce('does-not-exist-task-definition.json')
            .mockReturnValueOnce('web')
            .mockReturnValueOnce('nginx:latest');

        await run();

        expect(core.setFailed).toBeCalledWith('Task definition file does not exist: does-not-exist-task-definition.json');
    });

    test('error returned for non-JSON task definition contents', async () => {
        jest.mock('./non-json-task-definition.json', () => ("hello"), { virtual: true });

        core.getInput = jest
            .fn()
            .mockReturnValueOnce('non-json-task-definition.json')
            .mockReturnValueOnce('web')
            .mockReturnValueOnce('nginx:latest');

        await run();

        expect(core.setFailed).toBeCalledWith('Invalid task definition format: containerDefinitions section is not present or is not an array');
    });

    test('error returned for malformed task definition with non-array container definition section', async () => {
        jest.mock('./malformed-task-definition.json', () => ({
            family: 'task-def-family',
            containerDefinitions: {}
        }), { virtual: true });

        core.getInput = jest
            .fn()
            .mockReturnValueOnce('malformed-task-definition.json')
            .mockReturnValueOnce('web')
            .mockReturnValueOnce('nginx:latest');

        await run();

        expect(core.setFailed).toBeCalledWith('Invalid task definition format: containerDefinitions section is not present or is not an array');
    });

    test('error returned for task definition without matching container name', async () => {
        jest.mock('./missing-container-task-definition.json', () => ({
            family: 'task-def-family',
            containerDefinitions: [
                {
                    name: "main",
                    image: "some-other-image"
                }
            ]
        }), { virtual: true });

        core.getInput = jest
            .fn()
            .mockReturnValueOnce('missing-container-task-definition.json')
            .mockReturnValueOnce('web')
            .mockReturnValueOnce('nginx:latest');

        await run();

        expect(core.setFailed).toBeCalledWith('Invalid task definition: Could not find container definition with matching name');
    });
});
