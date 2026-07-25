import React, { useState } from 'react';
import Button from '@/components/elements/Button';
import { Form, Formik, FormikHelpers, Field as FormikField } from 'formik';
import { number, object } from 'yup';
import tw from 'twin.macro';
import Label from '@/components/elements/Label';
import FormikFieldWrapper from '@/components/elements/FormikFieldWrapper';
import Select from '@/components/elements/Select';
import useFlash from '@/plugins/useFlash';
import createServer from '@/api/freeservers/createServer';
import { useHistory } from 'react-router-dom';

interface Props {
    packageId: number;
    eggs: Egg[];
}

interface Egg {
    id: number;
    name: string;
}

interface OrderValues {
    eggId: number;
}

export default ({ packageId, eggs }: Props) => {
    const [ isSubmit, setSubmit ] = useState(false);

    const { clearFlashes, clearAndAddHttpError, addFlash } = useFlash();

    const history = useHistory();

    const submit = ({ eggId }: OrderValues, { setSubmitting }: FormikHelpers<OrderValues>) => {
        setSubmitting(false);
        setSubmit(true);
        clearFlashes('freeservers');

        createServer(packageId, eggId).then(data => {
            setSubmit(false);
            addFlash({ key: 'freeservers', message: 'You\'ve successfully created free server.', type: 'success', title: 'Success' });

            setTimeout(() => history.push(`/server/${data.data.uuid}`), 2000);
        }).catch(error => {
            setSubmit(false);
            clearAndAddHttpError({ key: 'freeservers', error });
        });
    };

    return (
        <>
            <Formik
                onSubmit={submit}
                initialValues={{ eggId: eggs[0].id }}
                validationSchema={object().shape({
                    eggId: number().required(),
                })}
            >
                <Form>
                    <div css={tw`flex flex-wrap`}>
                        <div css={tw`mb-6 w-full`}>
                            <Label>Selected Type</Label>
                            <FormikFieldWrapper name={'eggId'}>
                                <FormikField as={Select} name={'eggId'}>
                                    {eggs.map((item, key) => (
                                        <option key={key} value={item.id}>{item.name}</option>
                                    ))}
                                </FormikField>
                            </FormikFieldWrapper>
                        </div>
                    </div>
                    <div css={tw`flex justify-center`}>
                        <Button type={'submit'} color={'primary'} isSecondary disabled={isSubmit} isLoading={isSubmit}>
                            Get Free Server
                        </Button>
                    </div>
                </Form>
            </Formik>
        </>
    );
};
