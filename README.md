## Amazon ECS "Render Task Definition" Action for GitHub Actions

Inserts a container image URI and optionally given environment variables into an Amazon ECS task definition JSON file, creating a new task definition file.

## Usage

To insert the image URI `bluemaex/amazon-ecs-sample:latest` as the image for the `web` container in the task definition file, and then deploy the edited task definition file to ECS:

To add environment variables to you container definition you can add them to the job  or step environment like seen below. You have to prefix them with ``TASK_`` to avoid leaking secrets and adding unecessary variables. An env var like ``TASK_APP_NAME`` will be passed as ``APP_NAME`` to the container definition.

```yaml
    - name: Render Amazon ECS task definition
      id: render-web-container
      uses: bluemaex/amazon-ecs-render-task-definition@v1
      with:
        task-definition: task-definition.json
        container-name: web
        image: amazon/amazon-ecs-sample:latest
        # Following is optional, but you can change the prefix of env variables
        env-prefix: TASK_
      env:
        - TASK_APP_PORT: 4091
        - TASK_APP_DEBUG: false
        - TASK_APP_NAME: 'sample'
    - name: Deploy to Amazon ECS service
      uses: aws-actions/amazon-ecs-deploy-task-definition@v1
      with:
        task-definition: ${{ steps.render-web-container.outputs.task-definition }}
        service: my-service
        cluster: my-cluster
```

## License Summary

This code is made available under the MIT license.
