import React from 'react';
import { capitalize } from '@/lib/strings';
import { useFormikContext, Field as FormikField } from 'formik';
import tw from 'twin.macro';
import Field from '@/components/elements/Field';
import Switch from '@/components/elements/Switch';
import Select from '@/components/elements/Select';
import FormikFieldWrapper from '@/components/elements/FormikFieldWrapper';
import TitledGreyBox from '@/components/elements/TitledGreyBox';

const WrenchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-wrench" css={tw`inline mr-2`}>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"/>
    </svg>
);

interface ConfigFieldProps {
    config: {
        name: string;
        rawValue: string;
        inputType: string;
        options: string[];
    };
}

const ConfigFieldItem = ({ config }: ConfigFieldProps) => {
    const { setFieldValue, values } = useFormikContext<Record<string, any>>();

    const displayName = capitalize(config.name.replace(/-/g, ' '));

    return (
        <TitledGreyBox title={
            <span css={tw`flex items-center`}>
                <WrenchIcon />
                {displayName}
            </span>
        }>
            {config.inputType === 'text' && (
                <Field name={config.name} />
            )}
            
            {config.inputType === 'toggle' && (
                <div className={'mb-1'}>
                    <Switch
                        name={config.name}
                        label={displayName}
                        description={'Enable or disable this option'}
                        defaultChecked={values[config.name] as boolean}
                        onChange={() => {
                            setFieldValue(config.name, !values[config.name]);
                        }}
                    />
                </div>
            )}
            
            {config.inputType === 'dropdown' && (
                <FormikFieldWrapper name={config.name}>
                    <FormikField as={Select} name={config.name}>
                        {config.options.map((option, idx) => (
                            <option key={idx} value={option}>
                                {capitalize(option)}
                            </option>
                        ))}
                    </FormikField>
                </FormikFieldWrapper>
            )}
        </TitledGreyBox>
    );
};

export default ConfigFieldItem;

